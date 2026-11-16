import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { account, dayWords, localPhone } from "@/lib/customer-app";

/**
 * The phone app's Account additions (the owner, 15 Nov 2026; Sman-Backend
 * migration 0114), on the web: a profile picture, and asking Soroman to move
 * the account to a new phone number — an admin accepts or declines it.
 */

const MAX_MB = 8;

/** Their picture, with Choose / Remove beside it. */
export function ProfilePicture({ name }: { name: string }) {
	const qc = useQueryClient();
	const input = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);
	const profile = useQuery({
		queryKey: ["profile"],
		queryFn: () => account.profile(),
	});
	const url = profile.data?.avatarUrl || "";
	const initials =
		name
			.split(/\s+/)
			.map((w) => w[0])
			.filter(Boolean)
			.slice(0, 2)
			.join("")
			.toUpperCase() || "?";

	const choose = async (file: File | undefined) => {
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			toast.error("Choose a picture — a photo or an image file.");
			return;
		}
		if (file.size > MAX_MB * 1024 * 1024) {
			toast.error(`That picture is over ${MAX_MB} MB. Choose a smaller one.`);
			return;
		}
		setBusy(true);
		try {
			await account.setAvatar(file);
			await qc.invalidateQueries({ queryKey: ["profile"] });
			toast.success("Picture saved");
		} catch (e) {
			toast.error((e as Error)?.message || "Could not save the picture.");
		} finally {
			setBusy(false);
			if (input.current) input.current.value = "";
		}
	};

	const remove = async () => {
		setBusy(true);
		try {
			await account.removeAvatar();
			await qc.invalidateQueries({ queryKey: ["profile"] });
			toast.success("Picture removed");
		} catch (e) {
			toast.error((e as Error)?.message || "Could not remove the picture.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="flex items-center gap-4">
			<Avatar className="size-16">
				{url ? <AvatarImage src={url} alt="" /> : null}
				<AvatarFallback className="text-lg">{initials}</AvatarFallback>
			</Avatar>
			<div className="flex flex-wrap gap-2">
				<input
					ref={input}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={(e) => void choose(e.target.files?.[0])}
				/>
				<Button
					size="sm"
					variant="secondary"
					disabled={busy}
					onClick={() => input.current?.click()}
				>
					{busy ? "Saving…" : url ? "Change picture" : "Add a picture"}
				</Button>
				{url ? (
					<Button
						size="sm"
						variant="ghost"
						disabled={busy}
						onClick={() => void remove()}
					>
						Remove
					</Button>
				) : null}
			</div>
		</div>
	);
}

/** "Phone number" with the way to ask for a new one, and where that request stands. */
export function PhoneNumberFact({ phone }: { phone: string }) {
	const [open, setOpen] = useState(false);
	const request = useQuery({
		queryKey: ["phone-change"],
		queryFn: () => account.phoneChange(),
	});
	const waiting = request.data?.status === "pending" ? request.data : null;

	return (
		<div>
			<dt className="text-[0.65rem] tracking-[0.22em] text-muted-foreground uppercase">
				Phone number
			</dt>
			<dd className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
				<span className="font-medium">{localPhone(phone) || "Not set"}</span>
				<button
					type="button"
					className="font-medium text-accent hover:underline"
					onClick={() => setOpen(true)}
				>
					{waiting ? "Change asked for" : "Change"}
				</button>
			</dd>
			<PhoneChangeDialog
				open={open}
				onOpenChange={setOpen}
				phone={phone}
				onChanged={() => void request.refetch()}
			/>
		</div>
	);
}

function PhoneChangeDialog({
	open,
	onOpenChange,
	phone,
	onChanged,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	phone: string;
	onChanged: () => void;
}) {
	const request = useQuery({
		queryKey: ["phone-change"],
		queryFn: () => account.phoneChange(),
		enabled: open,
		refetchOnMount: "always",
	});
	const [newPhone, setNewPhone] = useState("");
	const [note, setNote] = useState("");
	const [busy, setBusy] = useState(false);

	const current = localPhone(phone);
	const latest = request.data ?? null;
	const waiting = latest?.status === "pending" ? latest : null;
	const declined = latest?.status === "declined" ? latest : null;
	const problem =
		newPhone.replace(/\D/g, "").length < 10 ? "Enter the new phone number" : "";

	const send = async () => {
		if (problem || busy) return;
		setBusy(true);
		try {
			await account.askPhoneChange(newPhone, note.trim());
			toast.success("Request sent", {
				description: "We will let you know once it is accepted.",
			});
			setNewPhone("");
			setNote("");
			await request.refetch();
			onChanged();
		} catch (e) {
			toast.error((e as Error)?.message || "Not sent. Please try again.");
		} finally {
			setBusy(false);
		}
	};

	const cancel = async () => {
		if (!waiting || busy) return;
		setBusy(true);
		try {
			await account.cancelPhoneChange(waiting.id);
			toast.success("Request cancelled");
			await request.refetch();
			onChanged();
		} catch (e) {
			toast.error(
				(e as Error)?.message || "Could not cancel. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Phone number</DialogTitle>
					<DialogDescription>
						Ask us to move your account to a new number. We check it and accept
						it.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 px-5">
					<div className="border-y py-3">
						<p className="text-[11px] font-semibold tracking-wider text-muted-foreground">
							YOUR NUMBER NOW
						</p>
						<p className="mt-0.5 text-xl font-semibold">{current || "—"}</p>
					</div>

					{waiting ? (
						<div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
							<p className="font-semibold text-amber-700 dark:text-amber-400">
								Waiting for Soroman
							</p>
							<p className="mt-1 text-sm">
								You asked on {dayWords(waiting.createdAt)} to change to{" "}
								{localPhone(waiting.newPhone)}. Once we accept it, sign in again
								with the new number — we send the code there.
							</p>
						</div>
					) : (
						<>
							{declined ? (
								<div className="rounded-xl border border-red-600/40 bg-red-600/5 p-4">
									<p className="font-semibold text-red-700 dark:text-red-400">
										Your last request was not accepted
									</p>
									<p className="mt-1 text-sm">
										{localPhone(declined.newPhone)}
										{declined.declineReason
											? `: ${declined.declineReason}`
											: ""}
									</p>
								</div>
							) : null}
							<div className="space-y-1.5">
								<Label htmlFor="new-phone">New phone number</Label>
								<Input
									id="new-phone"
									inputMode="tel"
									autoComplete="tel"
									value={newPhone}
									onChange={(e) => setNewPhone(e.target.value)}
									placeholder="0803 000 0000"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="new-phone-note">Why? (optional)</Label>
								<Input
									id="new-phone-note"
									value={note}
									onChange={(e) => setNote(e.target.value)}
									placeholder="e.g. I lost my old line"
								/>
							</div>
							<p className="text-sm text-muted-foreground">
								Once accepted, {current || "your old number"} stops signing in,
								and you sign in with the new number.
							</p>
						</>
					)}
				</div>

				<DialogFooter>
					{waiting ? (
						<Button
							variant="outline"
							disabled={busy}
							onClick={() => void cancel()}
						>
							Cancel my request
						</Button>
					) : (
						<Button
							disabled={Boolean(problem) || busy}
							onClick={() => void send()}
						>
							{busy ? "Sending…" : "Send request"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
