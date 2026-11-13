import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	AccountRows,
	CopyAllButton,
	CopyIconButton,
} from "@/components/virtual-account";
import {
	api,
	type PaymentCredit,
	type PlacedOrder,
	type VirtualAccount,
} from "@/lib/api";
import { deadlineWords, MONEY } from "@/lib/customer-app";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

export default function InvoiceStep({
	order,
	onReprice,
}: {
	order: PlacedOrder;
	/** Places the order again at current prices once the held price runs out. */
	onReprice: () => void;
}) {
	const [account, setAccount] = useState<VirtualAccount | null>(null);
	const [credits, setCredits] = useState<PaymentCredit[]>([]);
	const [now, setNow] = useState(() => Date.now());

	const paid = credits.reduce((sum, c) => sum + c.amount, 0);
	const remaining = Math.max(0, order.total - paid);
	const fullyPaid = remaining === 0 && credits.length > 0;
	const deadlineMs = order.lock_expires_at
		? new Date(order.lock_expires_at).getTime()
		: null;
	const msLeft =
		deadlineMs == null
			? Number.POSITIVE_INFINITY
			: Math.max(0, deadlineMs - now);
	// An order with part paid is never cancelled at the end of the day.
	const expired = deadlineMs != null && msLeft === 0 && credits.length === 0;
	const by = deadlineWords(order.lock_expires_at);
	useEffect(() => {
		if (fullyPaid) return;
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, [fullyPaid]);

	useEffect(() => {
		let cancelled = false;
		void api.payments.dedicatedAccount().then((acct) => {
			if (!cancelled) setAccount(acct);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	// Poll for transfer confirmation once the account exists.
	useEffect(() => {
		if (!account) return;
		return api.payments.watchCredits(order.total, (credit) =>
			setCredits((prev) =>
				prev.some((c) => c.id === credit.id) ? prev : [...prev, credit],
			),
		);
	}, [account, order.total]);

	return (
		<div className="mx-auto max-w-2xl">
			<div className="overflow-hidden rounded-xl border">
				<div className="flex items-center justify-between border-b px-5 py-3.5">
					<span className="text-[0.65rem] tracking-[0.25em] uppercase">
						Invoice {order.id}
					</span>
					<PayByBadge by={by} expired={expired} paid={fullyPaid} />
				</div>

				{expired && (
					<div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/60 px-5 py-3">
						<p className="text-xs text-muted-foreground">
							Not paid by the end of the day, so this order is cancelled. Order
							again at today&apos;s price.
						</p>
						<Button size="sm" onClick={onReprice}>
							Order again
						</Button>
					</div>
				)}

				<div className="border-b px-5 py-4">
					{order.lines.map((l) => (
						<div
							key={l.product_id}
							className="flex justify-between gap-4 py-1 text-sm tabular-nums"
						>
							<span className="text-muted-foreground">
								{l.quantity.toLocaleString()}{" "}
								{l.unit === "litre" ? "L" : l.unit} {l.name} ·{" "}
								{order.depot_name}
							</span>
							<span>{formatNaira(l.unit_price * l.quantity)}</span>
						</div>
					))}
					<div className="mt-2 flex items-baseline justify-between border-t pt-3">
						<span className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
							Total due
						</span>
						<span
							className={cn(
								"text-xl font-semibold tracking-tight tabular-nums",
								fullyPaid ? MONEY.paid : expired ? MONEY.void : MONEY.owed,
							)}
						>
							{formatNaira(order.total)}
						</span>
					</div>
				</div>

				<div className="border-b px-5 py-4">
					<div className="flex items-center justify-between gap-4">
						<p className="text-[0.65rem] tracking-[0.22em] text-muted-foreground uppercase">
							Pay into
						</p>
						{account && <CopyAllButton account={account} />}
					</div>
					{account ? (
						<AccountRows account={account} className="mt-3 border-accent/40" />
					) : (
						<div className="mt-3 space-y-2" aria-live="polite">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<p className="text-[0.65rem] text-muted-foreground/70">
								Fetching the payment account…
							</p>
						</div>
					)}
					<div className="mt-3 flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5">
						<div className="min-w-0">
							<p className="text-xs text-muted-foreground">
								Write this as the transfer description
							</p>
							<p className="truncate font-semibold tabular-nums">{order.id}</p>
						</div>
						<CopyIconButton value={order.id} label="Copy order number" />
					</div>
					<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
						Transfer exactly{" "}
						<span className={cn("font-semibold", MONEY.owed)}>
							{formatNaira(remaining)}
						</span>{" "}
						from any bank
						{by && !expired ? (
							<>
								{" "}
								by <span className="font-semibold text-foreground">{by}</span>.
								Your price stays as it was until then
							</>
						) : null}
						. Our finance team matches your transfer to this order — no receipt
						needed.
					</p>
				</div>

				<div className="px-5 py-4">
					<div className="flex justify-between text-[0.65rem] tracking-[0.12em] uppercase tabular-nums">
						<span className={paid > 0 ? MONEY.paid : "text-muted-foreground"}>
							{formatNaira(paid)} received
						</span>
						<span className={cn(fullyPaid ? MONEY.paid : MONEY.owed)}>
							{fullyPaid ? "Fully paid" : `${formatNaira(remaining)} remaining`}
						</span>
					</div>
					<div className="mt-2 h-1 bg-muted">
						<div
							className="h-full bg-accent transition-[width] duration-500 ease-luxe"
							style={{ width: `${Math.min(100, (paid / order.total) * 100)}%` }}
						/>
					</div>
					<ul aria-live="polite">
						{credits.map((c) => (
							<li
								key={c.id}
								className="snapshot-rise mt-2.5 flex justify-between border-t pt-2.5 text-xs tabular-nums"
							>
								<span className="text-muted-foreground">{c.from}</span>
								<span className={MONEY.paid}>+{formatNaira(c.amount)}</span>
							</li>
						))}
					</ul>
					{!fullyPaid && (
						<p className="mt-3 text-[0.65rem] leading-relaxed text-muted-foreground/70">
							{credits.length === 0 && account
								? "Waiting for your first transfer. "
								: ""}
							Transferred but not showing? It shows once our finance team has
							matched it, and we text you when it is.
						</p>
					)}
				</div>

				{fullyPaid && (
					<div className="snapshot-rise border-t border-accent/40 bg-accent/5 px-5 py-4">
						<p className="text-sm font-semibold text-accent">
							Payment complete — order {order.id} confirmed
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Your trucks are being scheduled. Every status change reaches you
							by SMS.{" "}
							{/* Tracking and the rest of the exits live in the
							NextSteps panel directly below, so this stays a confirmation. */}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

function PayByBadge({
	by,
	expired,
	paid,
}: {
	by: string | null;
	expired: boolean;
	paid: boolean;
}) {
	if (paid) {
		return (
			<span className="text-[0.65rem] tracking-[0.15em] text-emerald-700 uppercase dark:text-emerald-400">
				Paid
			</span>
		);
	}
	if (expired) {
		return (
			<span className="text-[0.65rem] tracking-[0.15em] text-red-600 uppercase dark:text-red-400">
				Time to pay has passed
			</span>
		);
	}
	return (
		<span className="text-[0.65rem] tracking-[0.15em] text-amber-700 uppercase tabular-nums dark:text-amber-500">
			{by ? `Pay by ${by}` : "Awaiting payment"}
		</span>
	);
}
