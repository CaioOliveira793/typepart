import { Readable } from "node:stream";


export interface MultpartField<T> {
	name: string;
	value: T;
	isNameTruncated: boolean;
	isValueTruncated: boolean;
	encoding: string;
	mimetype: string;
}

export interface MultpartFileStream extends Readable {
	truncated: boolean;
}

export interface MultpartFile {
	stream: MultpartFileStream;
	filename: string;
	fieldname: string;
	encoding: string;
	mimetype: string;
}

export type Headers = Record<string, string>;

/**
 * A consumer for the emited multipart files
 *
 * The multipart consumer contract is to **handle every file** emited and
 * _possibly_ do a rollback in the operation once done in the file.
 *
 * The file handling **must** be done in one the following ways:
 * - reading the `MultpartFile.stream` by pipeing to some write stream
 * or simply `stream.resume`
 * - throwing an error (the file consuption is done by the `FileHandler`
 * discarting the `MultpartFile` contents)
 *
 * After processing, a `ConsumedFileResult` **must** be returned with the purprose
 * of identifing the handled file in a rollback case
 *
 * If an error is thrown, it will bublle up to the `parseMultpart` caller,
 * beeing the responsable to call (if wanted) `FileHandler.rollbackAllFiles`,
 * interruping the processing (`stream.unpipe`), discarting all the remaning
 * multpart file contents (`stream.resume`) and calling `MultpartConsumer.rollbackFile`.
 *
 * Rollback **should** undo any operation done with the file, identified by
 * the `ConsumedFileResult`. Any error thrown is bublled up to the `parseMultpart`
 * caller.
 */
export interface MultpartConsumer<ConsumedFileResult, Metadata = undefined> {
	/**
	 * Process the file consuming its contents.
	 * @param file `MultpartFile` to be consumed
	 * @returns `ConsumedFileResult`
	 */
	processFile(file: MultpartFile, metadata: Metadata): Promise<ConsumedFileResult>;

	/**
	 * May rollback the previous file processing.
	 * @param file `ConsumedFileResult`
	 */
	rollbackFile(file: ConsumedFileResult, metadata: Metadata): Promise<void>;
}

export type GrupedFileds = Record<string, string>;

export interface MultpartResult<Fields extends GrupedFileds, ConsumedFileResult> {
	fields: Fields;
	files: ConsumedFileResult[];
}

export enum MultpartErrorKind {
	PartCountExceded = 'PART_COUNT_EXCEDED',
	FieldCountExceded = 'FIELD_COUNT_EXCEDED',
	FileCountExceded = 'FILE_COUNT_EXCEDED',

	TruncatedFile = 'TRUNCATED_FILE',

	TruncatedFieldKey = 'TRUNCATED_FIELD_KEY',
	TruncatedFieldValue = 'TRUNCATED_FIELD_VALUE',
}

export class MultpartParseError extends Error {
	public readonly kind: MultpartErrorKind;

	constructor(kind: MultpartErrorKind) {
		super(`An ${kind} error ocurred parsing multpart data`);
		this.kind = kind;
	}

}
