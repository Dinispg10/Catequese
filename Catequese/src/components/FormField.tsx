import { ChangeEvent, forwardRef } from 'react';

interface FormFieldProps {
  label: string;
  value: string | number | undefined;
  onChange: (value: any) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  name?: string;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  required,
  placeholder,
  disabled,
  error,
  name
}, ref) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    // If it's a number type, try to pass the number
    if (type === 'number') {
      const val = event.target.value === '' ? '' : Number(event.target.value);
      onChange(val);
    } else {
      onChange(event.target.value);
    }
  };

  return (
    <label className="field">
      <span>{label}</span>
      <input
        ref={ref}
        name={name}
        type={type}
        value={value ?? ''}
        onChange={handleChange}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className={error ? 'error' : ''}
      />
      {error && <span className="field-error" style={{ color: 'var(--error-txt)', fontSize: '11px', marginTop: '2px' }}>{error}</span>}
    </label>
  );
});

FormField.displayName = 'FormField';

export default FormField;
