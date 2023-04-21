import { Readable } from "node:stream";
import Busboy from 'busboy';
import { MultipartErrorKind, MultipartParseError, GrupedFileds, MultipartFileStream as MultipartFileStream, MultipartResult, Headers } from "./MultipartTypes";
import { FieldHandler, FieldHandlerOptions } from "./handlers/FieldHandler";
import { FileHandler } from './handlers/FileHandler';


export interface LimitOptions {
	fieldNameSize?: number;
	fieldSize?: number;
	fields?: number;
	fileSize?: number;
	files?: number;
	parts?: number;
	headerPairs?: number;
}

const DEFAULT_LIMIT_OPTIONS: LimitOptions = {
	fileSize: 10 * 1024 * 1024, // 10 MB
	files: 30
}

export interface ParseMultipartOptions extends FieldHandlerOptions, LimitOptions { }

type FieldListener = (
	name: string,
	value: any,
	isNameTruncated: boolean,
	isValueTruncated: boolean,
	encoding: string,
	mimetype: string
) => void;

type FileListener = (
	fieldname: string,
	stream: MultipartFileStream,
	filename: string,
	encoding: string,
	mimetype: string
) => void;

function createFieldListerner(fieldHandler: FieldHandler, onError: (err: unknown) => void): FieldListener {
	return (name, value, isNameTruncated, isValueTruncated, encoding, mimetype) => {
		try {
			fieldHandler.handleField({ name, value, encoding, mimetype, isNameTruncated, isValueTruncated });
		} catch (err) {
			onError(err);
		}
	}
}

function createFileListener<T, Metadata>(
	fileHandler: FileHandler<T, Metadata>,
	filePromises: Promise<void>[],
	rejectMultipart: (err: unknown) => void
): FileListener {
	return (fieldname, stream, filename, encoding, mimetype) => {
		filePromises.push(new Promise((resolve, rejectFile) => {
			fileHandler.handleFile({ encoding, filename, fieldname, mimetype, stream })
				.then(resolve)
				.catch(err => {
					rejectMultipart(err);
					rejectFile(err);
				});
		}));
	}
}

export interface ParseMultipartInput<T, Metadata> {
	headers: Headers;
	request: Readable;
	fieldHandler: FieldHandler;
	fileHandler: FileHandler<T, Metadata>;
	options: ParseMultipartOptions;
}

export async function parseMultipart<T, Metadata>({
	fieldHandler,
	fileHandler,
	options,
	headers,
	request,
}: ParseMultipartInput<T, Metadata>): Promise<MultipartResult<GrupedFileds, T>> {
	const busboy = new Busboy({
		headers: headers,
		limits: { ...DEFAULT_LIMIT_OPTIONS, ...options },
	});

	const filePromises: Promise<void>[] = [];

	const busboyPromise = new Promise<void>((resolve, reject) => {
		busboy.on('error', reject);

		busboy.on('field', createFieldListerner(fieldHandler, reject));
		busboy.on('file', createFileListener(fileHandler, filePromises, reject));

		busboy.on(
			'partsLimit',
			() => reject(new MultipartParseError(MultipartErrorKind.PartCountExceded))
		);

		busboy.on(
			'filesLimit',
			() => reject(new MultipartParseError(MultipartErrorKind.FileCountExceded))
		);

		busboy.on(
			'fieldsLimit',
			() => reject(new MultipartParseError(MultipartErrorKind.FieldCountExceded))
		);

		busboy.on('finish', (err: unknown) => {
			if (err) {
				reject(err);
			}
			resolve();
		});
	});

	try {
		request.pipe(busboy);
		await busboyPromise;
		await Promise.all(filePromises);

		return {
			files: fileHandler.getConsumedFiles(),
			fields: fieldHandler.getFields()
		};
	} finally {
		request.unpipe(busboy);
		busboy.removeAllListeners();
		request.resume();
	}
}
