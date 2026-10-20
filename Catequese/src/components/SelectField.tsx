interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  name?: string;
  disabled?: boolean;
}

export default function SelectField({
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Selecionar',
  required,
  name,
  disabled
}: SelectFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <select 
        value={value ?? ''} 
        onChange={(event) => onChange(event.target.value)} 
        onBlur={onBlur}
        required={required}
        name={name}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
