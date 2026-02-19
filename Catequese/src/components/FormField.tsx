import { ChangeEvent } from 'react';

interface FormFieldProps {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function FormField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  disabled
}: FormFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}
