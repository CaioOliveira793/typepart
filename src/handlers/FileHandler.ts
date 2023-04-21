import { MultipartFile, MultipartConsumer, MultipartErrorKind, MultipartParseError } from "../MultipartTypes";


export class FileHandler<T, Metadata> {
	constructor(
		private readonly consumer: MultipartConsumer<T, Metadata>,
		private readonly meta: Metadata
	) { }

	public async handleFile(file: MultipartFile): Promise<void> {
		this.files.push(file);
		try {
			const consumedFile = await this.consumer.processFile(file, this.meta);
			this.consumedFiles.push(consumedFile);
		} catch (err) {
			file.stream.resume();
			throw err;
		}
	}

	public async rollbackAllFiles(): Promise<void> {
		for (const multpartFile of this.files) {
			multpartFile.stream.unpipe();
			multpartFile.stream.resume();
		}

		await Promise.all(this.consumedFiles.map(id => this.consumer.rollbackFile(id, this.meta)));
	}

	public getConsumedFiles(): T[] {
		const truncated = this.files.some(file => file.stream.truncated);
		if (truncated)
			throw new MultipartParseError(MultipartErrorKind.TruncatedFile);

		return this.consumedFiles;
	}

	private readonly consumedFiles: T[] = [];
	private readonly files: MultipartFile[] = [];
}
