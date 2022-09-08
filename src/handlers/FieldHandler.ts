import { MultpartField, GrupedFileds, MultpartParseError, MultpartErrorKind } from "../MultpartTypes";


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

	handleField(field: MultpartField<string>): void {
		if (!this.options.allowTruncateFieldName && field.isNameTruncated)
			throw new MultpartParseError(MultpartErrorKind.TruncatedFieldKey);

		if (!this.options.allowTruncateFieldValue && field.isValueTruncated)
			throw new MultpartParseError(MultpartErrorKind.TruncatedFieldValue);

		this.fields[field.name] = field.value;
	}

	getFields(): GrupedFileds {
		return this.fields;
	}

	private fields: GrupedFileds = {};
}
