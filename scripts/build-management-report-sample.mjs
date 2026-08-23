import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('artifacts/management-report-sample.docx');
const p = (text, options = {}) => new Paragraph({ bidirectional: true, alignment: options.center ? AlignmentType.CENTER : AlignmentType.RIGHT, heading: options.heading, children: [new TextRun({ text, bold: options.bold, font: 'Vazirmatn', size: options.size ?? 22 })] });
const cell = (text, bold = false) => new TableCell({ children: [p(String(text), { bold })] });
const table = (headers, rows) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: headers.map((item) => cell(item, true)), tableHeader: true }), ...rows.map((row) => new TableRow({ children: row.map((item) => cell(item)) }))] });
const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 600, bottom: 720, left: 600 } } }, children: [
  p('گزارش مدیریتی بازی‌های متفکر', { center: true, heading: HeadingLevel.TITLE, bold: true, size: 34 }),
  p('بازه گزارش: ۷ روز اخیر'),
  p('خلاصه بازی‌ها', { heading: HeadingLevel.HEADING_1, bold: true, size: 28 }),
  table(['بازی', 'شروع', 'تکمیل', 'Replay', 'میانگین زمان', 'نرخ تکمیل'], [['هدیه تولد مادربزرگ', 51, 34, 9, '۸٫۴ دقیقه', '۶۷٪'], ['راه نجات بلوط‌ها', 36, 22, 5, '۹٫۱ دقیقه', '۶۱٪']]),
  p('جزئیات مراحل، انتخاب‌ها و ریزش', { heading: HeadingLevel.HEADING_1, bold: true, size: 28 }),
  table(['مرحله', 'ورود', 'انتخاب ۱', 'انتخاب ۲', 'ریزش'], [[1, 29, 'تور: ۱۸', 'سنگ: ۷، پل: ۴', 3], [2, 24, 'سه حلقه کامل: ۲۲', '—', 2]])
] }] });
await mkdir(resolve('artifacts'), { recursive: true });
await writeFile(output, await Packer.toBuffer(doc));
console.log(output);
