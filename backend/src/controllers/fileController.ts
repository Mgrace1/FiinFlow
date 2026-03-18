import { Response } from 'express';
import { File as FileModel, Invoice } from '../models';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

export const uploadFile = async (req: AuthRequest, res: Response) =>{
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const { type } = req.body;

    if (!type || !['proforma', 'invoice', 'receipt'].includes(type)) {
      // Delete the uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Must be proforma, invoice, or receipt',
      });
    }

    const file = await FileModel.create({
      companyId: req.companyId,
      type,
      path: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.userId,
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: file,
    });
  } catch (error: any) {
    console.error('Upload file error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file',
    });
  }
};

export const getFiles = async (req: AuthRequest, res: Response) =>{
  try {
    const { type } = req.query;
    const filter: any = req.userRole === 'super_admin' ? {} : { companyId: req.companyId };

    if (type) filter.type = type;

    const files = await FileModel.find(filter).sort({ uploadedAt: -1 });

    res.json({
      success: true,
      data: files,
    });
  } catch (error: any) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch files',
    });
  }
};

export const getFile = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const file = await FileModel.findOne({
      _id: req.params.id,
      ...(isSuperAdmin ? {} : { companyId: req.companyId }),
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error: any) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch file',
    });
  }
};

export const downloadFile = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const file = await FileModel.findOne({
      _id: req.params.id,
      ...(isSuperAdmin ? {} : { companyId: req.companyId }),
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on server',
      });
    }
    const fallbackName = path.basename(file.path);
    const safeName = path.basename(file.originalName || fallbackName);
    const mimeType = file.mimeType || 'application/octet-stream';
    const inline = String(req.query.inline || '').toLowerCase() === 'true';
    const disposition = inline ? 'inline' : 'attachment';

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${safeName.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
    );

    const stream = fs.createReadStream(file.path);
    stream.on('error', (streamError) => {
      console.error('File stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to read file',
        });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (error: any) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download file',
    });
  }
};

export const deleteFile = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const file = await FileModel.findOneAndDelete({
      _id: req.params.id,
      ...(isSuperAdmin ? {} : { companyId: req.companyId }),
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    // Delete physical file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete file',
    });
  }
};

/**
 * Upload file and attach to invoice
 */
export const uploadInvoiceAttachment = async (req: AuthRequest, res: Response) =>{
  try {
    const { invoiceId } = req.params;
    const { type } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    if (!type) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Attachment type is required',
      });
    }

    // Validate attachment type
    const validTypes = ['proforma', 'invoice_pdf', 'service_attachment', 'payment_receipt'];
    if (!validTypes.includes(type)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Invalid attachment type',
      });
    }

    // Find the invoice
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      companyId: req.companyId,
    });

    if (!invoice) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Create file record
    const file = await FileModel.create({
      companyId: req.companyId,
      type,
      path: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.userId,
    });

    // Add attachment to invoice
    const attachments = invoice.attachments || [];
    attachments.push({
      fileId: file._id,
      type,
      uploadedAt: new Date(),
    } as any);
    invoice.attachments = attachments;
    await invoice.save();

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileId: file._id,
        filename: file.originalName,
        type: file.type,
        size: file.size,
      },
    });
  } catch (error: any) {
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file',
    });
  }
};

/**
 * Get invoice attachments
 */
export const getInvoiceAttachments = async (req: AuthRequest, res: Response) =>{
  try {
    const { invoiceId } = req.params;

    const isSuperAdmin = req.userRole === 'super_admin';
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      ...(isSuperAdmin ? {} : { companyId: req.companyId }),
    }).populate('attachments.fileId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      data: invoice.attachments || [],
    });
  } catch (error: any) {
    console.error('Get attachments error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch attachments',
    });
  }
};

/**
 * Delete invoice attachment
 */
export const deleteInvoiceAttachment = async (req: AuthRequest, res: Response) =>{
  try {
    const { invoiceId, fileId } = req.params;

    const isSuperAdmin = req.userRole === 'super_admin';
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      ...(isSuperAdmin ? {} : { companyId: req.companyId }),
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const file = await FileModel.findOne({
      _id: fileId,
      ...(isSuperAdmin ? {} : { companyId: req.companyId }),
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    // Remove attachment from invoice
    invoice.attachments = (invoice.attachments || []).filter(
      (att: any) =>att.fileId.toString() !== fileId
    );
    await invoice.save();

    // Delete file from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Delete file record
    await FileModel.deleteOne({ _id: fileId });

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete attachment',
    });
  }
};
