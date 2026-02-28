/**
 * Format date string to dd-mm-yyyy format
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string in dd-mm-yyyy format
 */
export const formatDateDMY = (dateString: string | Date | undefined | null): string =>{
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return '-';

    // Use en-GB locale for dd/mm/yyyy format, then replace slashes with dashes
    return date.toLocaleDateString('en-GB').split('/').join('-');
  } catch (error) {
    return '-';
  }
};

/**
 * Format date string to dd/mm/yyyy format (with slashes)
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string in dd/mm/yyyy format
 */
export const formatDateDMYSlash = (dateString: string | Date | undefined | null): string =>{
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-GB');
  } catch (error) {
    return '-';
  }
};

/**
 * Format date to readable format: "15 Jan 2024"
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string
 */
export const formatDateReadable = (dateString: string | Date | undefined | null): string =>{
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return '-';

    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Format datetime to readable format with time: "15 Jan 2024, 14:30"
 * @param dateString - ISO date string or Date object
 * @returns Formatted datetime string
 */
export const formatDateTime = (dateString: string | Date | undefined | null): string =>{
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return '-';

    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return `${day} ${month} ${year}, ${time}`;
  } catch (error) {
    return '-';
  }
};
