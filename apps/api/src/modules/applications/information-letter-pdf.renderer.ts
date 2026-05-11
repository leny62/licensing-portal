export interface InformationLetterPdfInput {
  referenceNumber: string;
  institutionName: string;
  subject: string;
  body: string;
  issuedAt: Date;
  responseDueAt: Date;
}

interface PdfTextLine {
  text: string;
  x: number;
  y: number;
  size: number;
  font: 'F1' | 'F2';
}

const pageWidth = 612;
const pageHeight = 792;
const marginX = 54;

export function renderInformationLetterPdfTemplate(input: InformationLetterPdfInput): Buffer {
  const lines = buildTemplateLines(input);
  const content = [
    '0.95 0.97 1 rg 0 724 612 68 re f',
    '0.13 0.22 0.41 rg 0 724 612 4 re f',
    '0.89 0.59 0 rg 54 712 96 3 re f',
    '0.88 0.91 0.95 RG 54 126 504 1 re S',
    ...lines.map((line) => textCommand(line)),
  ].join('\n');

  return buildPdf(content);
}

function buildTemplateLines(input: InformationLetterPdfInput): PdfTextLine[] {
  const issued = formatDate(input.issuedAt);
  const due = formatDate(input.responseDueAt);
  const bodyLines = wrapText(input.body, 92);
  const lines: PdfTextLine[] = [
    line('Bank Licensing and Compliance Portal', marginX, 764, 15, 'F2'),
    line('Regulatory information request', marginX, 744, 10, 'F1'),
    line('Information Letter', marginX, 690, 18, 'F2'),
    line(`Reference: ${input.referenceNumber}`, marginX, 660, 10, 'F2'),
    line(`Institution: ${input.institutionName}`, marginX, 644, 10, 'F1'),
    line(`Issued: ${issued}`, marginX, 628, 10, 'F1'),
    line(`Response due: ${due}`, marginX, 612, 10, 'F1'),
    line('Subject', marginX, 572, 11, 'F2'),
    line(input.subject, marginX, 552, 11, 'F1'),
    line('Request details', marginX, 512, 11, 'F2'),
  ];

  let y = 492;
  for (const bodyLine of bodyLines) {
    if (y < 154) {
      lines.push(line('Continued on secure portal record.', marginX, y, 10, 'F1'));
      break;
    }

    lines.push(line(bodyLine, marginX, y, 10, 'F1'));
    y -= 15;
  }

  lines.push(
    line('This letter is generated from the controlled application record.', marginX, 104, 9, 'F1'),
    line(
      'Verify current status, audit entries, and submitted evidence in the portal.',
      marginX,
      90,
      9,
      'F1',
    ),
  );

  return lines;
}

function line(
  text: string,
  x: number,
  y: number,
  size: number,
  font: PdfTextLine['font'],
): PdfTextLine {
  return { text, x, y, size, font };
}

function wrapText(value: string, maxCharacters: number): string[] {
  const paragraphs = value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((paragraph) => paragraph.trim());
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = current.length === 0 ? word : `${current} ${word}`;
      if (next.length > maxCharacters && current.length > 0) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }

    if (current.length > 0) {
      lines.push(current);
    }
  }

  return lines;
}

function textCommand(line: PdfTextLine): string {
  return `BT /${line.font} ${line.size} Tf ${line.x} ${line.y} Td (${pdfText(line.text)}) Tj ET`;
}

function buildPdf(content: string): Buffer {
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj`,
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
    `6 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
  ];
  const header = '%PDF-1.4\n';
  let offset = Buffer.byteLength(header);
  const xrefOffsets = ['0000000000 65535 f '];
  const body = objects
    .map((object) => {
      xrefOffsets.push(`${String(offset).padStart(10, '0')} 00000 n `);
      offset += Buffer.byteLength(`${object}\n`);
      return object;
    })
    .join('\n');
  const xrefStart = Buffer.byteLength(`${header}${body}\n`);
  const xref = `xref\n0 ${objects.length + 1}\n${xrefOffsets.join('\n')}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(`${header}${body}\n${xref}`);
}

function pdfText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}
