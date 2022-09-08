import { MultpartFile } from "./MultpartTypes";


export interface FileResultProps {
	fieldname: string;
	originalname: string;
	encoding: string | null;
	mimetype: string;
	size: number;
	id: string;
	filepath: string;
}

interface FileResultExt {
	id: string;
	size: number;
	filepath: string;
}

export class FileResult {
	public readonly fieldname: string;
	public readonly originalname: string;
	public readonly encoding: string | null;
	public readonly mimetype: string;
	public readonly size: number;
	public readonly id: string;
	public readonly filepath: string;

	constructor(dto: FileResultProps) {
		this.originalname = dto.originalname;
		this.fieldname = dto.fieldname;
		this.mimetype = dto.mimetype;
		this.encoding = dto.encoding;
		this.size = dto.size;
		this.id = dto.id;
		this.filepath = dto.filepath;
	}

	public static fromMultpartFile(file: MultpartFile, ext: FileResultExt): FileResult {
		return new FileResult({
			originalname: file.filename,
			encoding: file.encoding,
			mimetype: file.mimetype,
			fieldname: file.fieldname,
			size: ext.size,
			id: ext.id,
			filepath: ext.filepath,
		});
	}
}
