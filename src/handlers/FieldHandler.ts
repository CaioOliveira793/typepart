import { MultipartField, GrupedFileds, MultipartParseError, MultipartErrorKind } from "../MultipartTypes";


export interface FieldHandlerOptions {
	allowTruncateFieldName?: boolean;
	allowTruncateFieldValue?: boolean;
}

const DEFAULT_FIELD_HANDLER_OPTIONS: FieldHandlerOptions = {
	allowTruncateFieldName: false,
	allowTruncateFieldValue: false
}

export class FieldHandler {
	public readonly options: FieldHandlerOptions;

	constructor(opt?: FieldHandlerOptions) {
		this.options = { ...DEFAULT_FIELD_HANDLER_OPTIONS, ...opt };
	}

	handleField(field: MultipartField<string>): void {
		if (!this.options.allowTruncateFieldName && field.isNameTruncated)
			throw new MultipartParseError(MultipartErrorKind.TruncatedFieldKey);

		if (!this.options.allowTruncateFieldValue && field.isValueTruncated)
			throw new MultipartParseError(MultipartErrorKind.TruncatedFieldValue);

		this.fields[field.name] = field.value;
	}

	getFields(): GrupedFileds {
		return this.fields;
	}

	private fields: GrupedFileds = {};
}
