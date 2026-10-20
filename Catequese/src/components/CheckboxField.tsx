interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;
}

export default function CheckboxField({ label, checked, onChange, onBlur, name, disabled }: CheckboxFieldProps) {
  return (
    <label className="checkbox">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(event) => onChange(event.target.checked)} 
        onBlur={onBlur}
        name={name}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}
