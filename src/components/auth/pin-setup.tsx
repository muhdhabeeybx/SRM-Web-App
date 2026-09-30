import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError, showFieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { pinSchema } from "@/lib/validation";

const schema = z
	.object({ pin: pinSchema, confirm: z.string() })
	.refine((d) => d.pin === d.confirm, {
		message: "The two PINs don't match.",
		path: ["confirm"],
	});

/**
 * The step after a first code sign-in on an account with no PIN.
 *
 * Plenty of accounts were opened for customers from the admin dashboard, so
 * their first sign-in is also the first time they hear a PIN exists — and the
 * settings screen is the last place they'd look for one. Asking here, while
 * they're already in the flow, is what makes the next visit a six-digit tap
 * instead of another SMS. Skippable: it must never stand between a customer
 * and the order they came to see.
 */
export default function PinSetup({ onDone }: { onDone: () => void }) {
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { pin: "", confirm: "" },
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				await api.me.setPin(value.pin);
				toast.success("PIN set. Use it next time you sign in here.");
				onDone();
			} catch (err) {
				setError(
					err instanceof ApiError
						? err.message
						: "Couldn't save your PIN. Try again.",
				);
			}
		},
	});

	const pinInput = (
		name: "pin" | "confirm",
		id: string,
		label: string,
		autoFocus = false,
	) => (
		<form.Field name={name}>
			{(field) => (
				<div className="grid gap-1.5">
					<Label htmlFor={id}>{label}</Label>
					<Input
						id={id}
						type="password"
						inputMode="numeric"
						autoComplete="new-password"
						autoFocus={autoFocus}
						maxLength={6}
						placeholder="••••••"
						value={field.state.value}
						onChange={(e) => {
							field.handleChange(e.target.value.replace(/\D/g, "").slice(0, 6));
							setError(null);
						}}
						onBlur={field.handleBlur}
						aria-invalid={showFieldError(field.state.meta) || undefined}
						aria-describedby={`${id}-error`}
						className="h-11 text-base tracking-[0.4em]"
					/>
					<FieldError meta={field.state.meta} id={`${id}-error`} />
				</div>
			)}
		</form.Field>
	);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void form.handleSubmit();
			}}
			className="grid gap-6"
		>
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Set up your PIN
				</h1>
				<p className="mt-1.5 text-sm text-muted-foreground">
					Choose a 6-digit PIN and you can sign in on this device without
					waiting for a code.
				</p>
			</div>
			<div className="grid gap-4">
				{pinInput("pin", "setup-pin", "PIN", true)}
				{pinInput("confirm", "setup-pin-confirm", "Confirm PIN")}
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
			<form.Subscribe selector={(s) => s.isSubmitting}>
				{(submitting) => (
					<div className="grid gap-2">
						<Button type="submit" size="lg" disabled={submitting}>
							{submitting && <Loader2 className="animate-spin" />}
							Save PIN and continue
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="lg"
							disabled={submitting}
							onClick={onDone}
						>
							Skip for now
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
