import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "./Input";

/** Input password dengan tombol show/hide terpisah (sesuai desain). */
const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);

  const toggle = (
    <button
      type="button"
      onClick={() => setVisible((v) => !v)}
      aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
      aria-pressed={visible}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/15"
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return <Input ref={ref} type={visible ? "text" : "password"} rightSlot={toggle} {...props} />;
});

export default PasswordInput;
