import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import {
  PaymentIngestionConnection,
  PaymentIngestionEvent,
} from '../models';
import { processPaymentAlert } from '../services/paymentIngestionService';

const normalizeIdentifier = (value: string): string => value.trim().toLowerCase();

const toObjectId = (value: string): Types.ObjectId | null => {
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
};

export const createIngestionConnection = async (req: AuthRequest, res: Response) => {
  try {
    const { channel, identifier, displayName, isActive } = req.body;

    if (!channel || !identifier) {
      return res.status(400).json({
        success: false,
        error: 'Channel and identifier are required',
      });
    }

    const allowedChannels = ['gmail', 'sms_forward'];
    if (!allowedChannels.includes(String(channel))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid channel. Use gmail or sms_forward',
      });
    }

    const connection = await PaymentIngestionConnection.create({
      companyId: req.companyId,
      channel,
      identifier: normalizeIdentifier(String(identifier)),
      displayName: displayName ? String(displayName) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Ingestion connection created',
      data: connection,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'This mailbox/forwarding identifier is already connected',
      });
    }

    console.error('Create ingestion connection error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create ingestion connection',
    });
  }
};

export const getIngestionConnections = async (req: AuthRequest, res: Response) => {
  try {
    const connections = await PaymentIngestionConnection.find({
      companyId: req.companyId,
    })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: connections,
    });
  } catch (error: any) {
    console.error('Get ingestion connections error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch ingestion connections',
    });
  }
};

export const deleteIngestionConnection = async (req: AuthRequest, res: Response) => {
  try {
    const connection = await PaymentIngestionConnection.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Ingestion connection not found',
      });
    }

    res.json({
      success: true,
      message: 'Ingestion connection deleted',
    });
  } catch (error: any) {
    console.error('Delete ingestion connection error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to delete ingestion connection',
    });
  }
};

export const ingestPaymentAlert = async (req: AuthRequest, res: Response) => {
  try {
    const {
      source,
      channelIdentifier,
      externalId,
      subject,
      messageText,
      directionHint,
      targetType,
      targetId,
      dryRun,
    } = req.body;

    if (!messageText || !String(messageText).trim()) {
      return res.status(400).json({
        success: false,
        error: 'messageText is required',
      });
    }

    const safeSource = (['gmail', 'sms', 'manual'].includes(String(source))
      ? String(source)
      : 'manual') as 'gmail' | 'sms' | 'manual';

    const result = await processPaymentAlert({
      companyId: req.companyId as Types.ObjectId,
      createdBy: req.userId,
      source: safeSource,
      channelIdentifier: channelIdentifier ? String(channelIdentifier) : undefined,
      externalId: externalId ? String(externalId) : undefined,
      subject: subject ? String(subject) : undefined,
      messageText: String(messageText),
      directionHint: ['incoming', 'outgoing', 'unknown'].includes(String(directionHint))
        ? (directionHint as 'incoming' | 'outgoing' | 'unknown')
        : undefined,
      targetType: ['invoice', 'expense'].includes(String(targetType))
        ? (targetType as 'invoice' | 'expense')
        : undefined,
      targetId: targetId ? String(targetId) : undefined,
      dryRun: Boolean(dryRun),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Ingest payment alert error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to ingest payment alert',
    });
  }
};

const decodeGooglePushMessage = (reqBody: any) => {
  const pubsubData = reqBody?.message?.data;
  if (!pubsubData) return null;

  try {
    const decodedRaw = Buffer.from(String(pubsubData), 'base64').toString('utf8');
    return JSON.parse(decodedRaw);
  } catch {
    return null;
  }
};

export const gmailPushWebhook = async (req: Request, res: Response) => {
  try {
    const providedSecret = String(
      req.headers['x-ingestion-secret']
      || req.query.secret
      || req.body?.secret
      || ''
    );
    const expectedSecret = String(process.env.PAYMENT_INGESTION_WEBHOOK_SECRET || '');

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook secret',
      });
    }

    const decoded = decodeGooglePushMessage(req.body);
    const messageText = String(
      req.body?.messageText
      || req.body?.rawText
      || decoded?.messageText
      || decoded?.snippet
      || ''
    ).trim();

    if (!messageText) {
      return res.status(202).json({
        success: true,
        message: 'No message text in webhook payload',
      });
    }

    const explicitCompanyId = String(req.body?.companyId || decoded?.companyId || '').trim();
    const emailAddress = normalizeIdentifier(String(
      req.body?.emailAddress
      || decoded?.emailAddress
      || req.body?.channelIdentifier
      || ''
    ));

    let companyId: Types.ObjectId | null = explicitCompanyId ? toObjectId(explicitCompanyId) : null;
    if (!companyId && emailAddress) {
      const connection = await PaymentIngestionConnection.findOne({
        channel: 'gmail',
        identifier: emailAddress,
        isActive: true,
      }).select('companyId');
      if (connection?.companyId) {
        companyId = new Types.ObjectId(String(connection.companyId));
      }
    }

    if (!companyId) {
      return res.status(202).json({
        success: true,
        message: 'Webhook received but no company mapping found',
      });
    }

    const result = await processPaymentAlert({
      companyId,
      source: 'gmail',
      channelIdentifier: emailAddress || undefined,
      externalId: String(req.body?.externalId || decoded?.historyId || '').trim() || undefined,
      subject: String(req.body?.subject || decoded?.subject || '').trim() || undefined,
      messageText,
      directionHint: ['incoming', 'outgoing', 'unknown'].includes(String(req.body?.directionHint))
        ? (req.body.directionHint as 'incoming' | 'outgoing' | 'unknown')
        : undefined,
      dryRun: Boolean(req.body?.dryRun),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Gmail push webhook ingestion error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process Gmail push webhook',
    });
  }
};

export const getIngestionEvents = async (req: AuthRequest, res: Response) => {
  try {
    const limitParam = Number(req.query.limit);
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(100, Math.floor(limitParam))
      : 50;

    const events = await PaymentIngestionEvent.find({
      companyId: req.companyId,
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    console.error('Get ingestion events error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch ingestion events',
    });
  }
};
