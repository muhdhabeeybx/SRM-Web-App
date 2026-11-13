import { Landmark, Truck } from "lucide-react";
import type { ReactNode } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { CopyIconButton } from "@/components/virtual-account";
import { MONEY, type MoneyState } from "@/lib/customer-app";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

/**
 * The one layout for anything opened from Orders — a depot order or a truck
 * request look the same, as in the phone app (the owner, 13 Nov 2026):
 *
 *   title · what it is            status
 *   progress                      the steps, with where it stands
 *   details                       labelled figures, two to a row
 *   (pay into, when payment is due)
 *   buttons                       what can be done now
 */

export type StepState = "done" | "now" | "action" | "failed" | "later";
export type PanelStep = { title: string; detail?: string; state: StepState };
export type PanelFact = {
	label: string;
	value?: string | null;
	half?: boolean;
	money?: MoneyState;
};

/** The round mark a list row and a dialog title start with. */
export function ItemBadge({
	kind,
	family = "",
	moneyIn = true,
	size = "md",
}: {
	kind: "fuel" | "truck" | "payment";
	family?: string;
	moneyIn?: boolean;
	size?: "sm" | "md";
}) {
	const tone =
		kind === "payment"
			? moneyIn
				? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
				: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
			: family === "PMS"
				? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
				: family === "AGO"
					? "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"
					: family === "LPG"
						? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
						: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
	const box = size === "sm" ? "size-9" : "size-10";
	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
				box,
				tone,
			)}
		>
			{kind === "fuel" ? (
				<span className="text-[0.7rem] tracking-wide">{family || "—"}</span>
			) : kind === "truck" ? (
				<Truck className="size-[18px]" />
			) : (
				<Landmark className="size-[17px]" />
			)}
		</span>
	);
}

/** PMS / AGO / LPG from a product code or name ("DASHPMS09339", "Petrol (PMS)"). */
export function fuelFamily(...hints: (string | null | undefined)[]): string {
	const text = hints.filter(Boolean).join(" ").toUpperCase();
	for (const code of ["PMS", "AGO", "LPG", "DPK", "ATK"])
		if (text.includes(code)) return code;
	if (/PETROL/.test(text)) return "PMS";
	if (/DIESEL/.test(text)) return "AGO";
	if (/GAS/.test(text)) return "LPG";
	return "";
}

/** Where to pay and how much — the same box on an unpaid order and an approved truck. */
export function PayIntoBox({
	bankName,
	accountNumber,
	accountName,
	amount,
	by,
	reference,
}: {
	bankName: string;
	accountNumber: string;
	accountName: string;
	amount: number;
	by?: string | null;
	reference?: string;
}) {
	return (
		<section className="rounded-xl border bg-muted/40 p-4">
			<p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
				Pay into
			</p>
			<div className="mt-3 flex items-baseline justify-between gap-4">
				<span className="text-sm font-medium text-muted-foreground">
					Amount to pay
				</span>
				<span className={cn("text-xl font-semibold tabular-nums", MONEY.owed)}>
					{formatNaira(amount)}
				</span>
			</div>
			<div className="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-background px-3.5 py-3">
				<div className="min-w-0">
					<p className="text-xs text-muted-foreground">{bankName}</p>
					<p className="truncate text-xl font-semibold tracking-wider tabular-nums">
						{accountNumber}
					</p>
				</div>
				<CopyIconButton value={accountNumber} label="Copy account number" />
			</div>
			<p className="mt-2 font-semibold">{accountName}</p>
			{reference ? (
				<div className="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-background px-3.5 py-2.5">
					<div className="min-w-0">
						<p className="text-xs text-muted-foreground">
							Write this as the transfer description
						</p>
						<p className="truncate font-semibold tabular-nums">{reference}</p>
					</div>
					<CopyIconButton value={reference} label="Copy reference" />
				</div>
			) : null}
			<p className="mt-3 text-sm text-muted-foreground">
				Transfer exactly {formatNaira(amount)}
				{by ? ` by ${by}` : ""}. Our finance team matches it to you.
			</p>
		</section>
	);
}

const stepTone: Record<StepState, string> = {
	done: "border-emerald-600 bg-emerald-600",
	now: "border-amber-600 bg-amber-600",
	action: "border-amber-600 bg-amber-600",
	failed: "border-red-600 bg-red-600",
	later: "border-muted-foreground/40 bg-transparent",
};

export function RecordDialog({
	open,
	onOpenChange,
	title,
	subtitle,
	status,
	badge,
	steps,
	facts,
	children,
	footer,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	subtitle?: string;
	status?: { text: string; tone: string };
	badge?: ReactNode;
	steps: PanelStep[];
	facts: PanelFact[];
	children?: ReactNode;
	footer?: ReactNode;
}) {
	// Two halves share a row; anything else takes its own.
	const shown = facts.filter((f) => f.value != null && f.value !== "");
	const rows: PanelFact[][] = [];
	for (const f of shown) {
		const last = rows[rows.length - 1];
		if (f.half && last && last.length === 1 && last[0].half) last.push(f);
		else rows.push([f]);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90dvh] gap-0 overflow-hidden sm:max-w-xl">
				<DialogHeader className="border-b px-6 pt-6 pb-4">
					<div className="flex items-center gap-3 pr-8">
						{badge}
						<DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
					</div>
					<DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
						{subtitle ? <span>{subtitle}</span> : null}
						{status ? (
							<span
								className={cn(
									"rounded-full border px-2.5 py-0.5 text-xs font-semibold",
									status.tone,
								)}
							>
								{status.text}
							</span>
						) : null}
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
					<section>
						<p className="mb-3 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
							Progress
						</p>
						<ol>
							{steps.map((s, i) => (
								<li key={`${s.title}-${i}`} className="flex gap-3">
									<div className="flex w-3.5 flex-col items-center">
										<span
											className={cn(
												"mt-1 size-3.5 rounded-full border-2",
												stepTone[s.state],
											)}
										/>
										{i < steps.length - 1 ? (
											<span className="my-0.5 w-0.5 flex-1 bg-border" />
										) : null}
									</div>
									<div className="pb-3">
										<p
											className={cn(
												"font-semibold",
												s.state === "later" && "text-muted-foreground",
											)}
										>
											{s.title}
										</p>
										{s.detail ? (
											<p
												className={cn(
													"text-sm",
													s.state === "action"
														? "text-amber-700 dark:text-amber-400"
														: "text-muted-foreground",
												)}
											>
												{s.detail}
											</p>
										) : null}
									</div>
								</li>
							))}
						</ol>
					</section>

					<section className="border-t pt-5">
						<p className="mb-3 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
							Details
						</p>
						<div className="space-y-3">
							{rows.map((row) => (
								<div
									key={row.map((f) => f.label).join("|")}
									className="grid grid-cols-2 gap-4"
								>
									{row.map((f) => (
										<div
											key={f.label}
											className={row.length === 1 ? "col-span-2" : ""}
										>
											<p className="text-xs tracking-wide text-muted-foreground uppercase">
												{f.label}
											</p>
											<p
												className={cn(
													"mt-0.5 font-semibold break-words",
													f.money && MONEY[f.money],
													f.money && "text-base tabular-nums",
												)}
											>
												{f.value}
											</p>
										</div>
									))}
								</div>
							))}
						</div>
					</section>

					{children}
				</div>

				{footer ? (
					<DialogFooter className="border-t px-6 py-4">{footer}</DialogFooter>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
