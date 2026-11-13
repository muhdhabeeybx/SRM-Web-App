import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, type OrderRecord, type TrackingStage } from "@/lib/api";
import { deadlineWords, litres, whenWords } from "@/lib/customer-app";
import { formatNaira } from "@/lib/use-catalog";
import {
	fuelFamily,
	ItemBadge,
	type PanelStep,
	PayIntoBox,
	RecordDialog,
} from "./record-dialog";

/**
 * A depot order, opened from Orders — the same layout as a truck request (the
 * owner, 13 Nov 2026): status, progress, details, the account to pay into
 * while unpaid, and what can be done now. The full order page (trucks and
 * drivers) stays one click away.
 */

const STEPS: { key: TrackingStage; label: string }[] = [
	{ key: "received", label: "Order Received" },
	{ key: "payment_confirmed", label: "Payment Confirmed" },
	{ key: "processing", label: "Processing" },
	{ key: "released", label: "Released" },
	{ key: "loading", label: "Loading" },
	{ key: "completed", label: "Completed" },
];

const STATUS_STEP: Record<OrderRecord["status"], TrackingStage> = {
	awaiting_payment: "received",
	paid: "payment_confirmed",
	released: "released",
	loading: "loading",
	loaded: "completed",
	cancelled: "received",
	expired: "received",
};

const STATUS_TEXT: Record<OrderRecord["status"], string> = {
	awaiting_payment: "Awaiting payment",
	paid: "Payment Confirmed",
	released: "Released",
	loading: "Loading",
	loaded: "Completed",
	cancelled: "Cancelled",
	expired: "Expired",
};

const STATUS_TONE: Record<OrderRecord["status"], string> = {
	awaiting_payment:
		"border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
	paid: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
	released:
		"border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
	loading:
		"border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
	loaded:
		"border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
	cancelled: "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-400",
	expired: "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-400",
};

export function orderStatusView(o: OrderRecord) {
	const partPaid = o.status === "awaiting_payment" && (o.amount_paid ?? 0) > 0;
	return {
		text: partPaid ? "Part paid" : STATUS_TEXT[o.status],
		tone: STATUS_TONE[o.status],
	};
}

export function OrderDialog({
	order,
	onClose,
}: {
	order: OrderRecord | null;
	onClose: () => void;
}) {
	const qc = useQueryClient();
	const [confirmCancel, setConfirmCancel] = useState(false);
	const [busy, setBusy] = useState<"paid" | "cancel" | null>(null);
	const detail = useQuery({
		queryKey: ["order", order?.id],
		queryFn: () => api.orders.get(order?.id ?? ""),
		enabled: Boolean(order),
	});
	const full = detail.data && detail.data.id === order?.id ? detail.data : null;
	const o = full ?? order;

	const gone = o?.status === "cancelled" || o?.status === "expired";
	const unpaid = o?.status === "awaiting_payment";
	const paidSoFar = o?.amount_paid ?? 0;
	const left = Math.max(0, (o?.total ?? 0) - paidSoFar);
	const partPaid = unpaid && paidSoFar > 0;
	const by = deadlineWords(o?.lock_expires_at);
	const line = o?.lines[0];
	const family = fuelFamily(line?.abbreviation, line?.name);

	const at = o
		? STEPS.findIndex((s) => s.key === (full?.stage ?? STATUS_STEP[o.status]))
		: -1;
	const steps: PanelStep[] = !o
		? []
		: gone
			? [
					{
						title: "Order Received",
						detail: whenWords(o.placed_at),
						state: "done",
					},
					{
						title: o.status === "expired" ? "Expired" : "Cancelled",
						detail:
							o.status === "expired" ? "Not paid by the end of the day" : "",
						state: "failed",
					},
				]
			: STEPS.map((s, i) => {
					const reached = full?.reached?.[s.key];
					if (i <= at)
						return {
							title: s.label,
							detail: whenWords(
								reached ?? (s.key === "received" ? o.placed_at : null),
							),
							state: "done" as const,
						};
					if (i === at + 1 && unpaid)
						return {
							title: s.label,
							detail: partPaid
								? `${formatNaira(paidSoFar)} paid · ${formatNaira(left)} left to pay`
								: by
									? `Pay by ${by}`
									: "Waiting for your payment",
							state: "action" as const,
						};
					if (i === at + 1)
						return {
							title: s.label,
							detail: "In progress",
							state: "now" as const,
						};
					return { title: s.label, state: "later" as const };
				});

	const refresh = () =>
		Promise.all([
			qc.invalidateQueries({ queryKey: ["orders"] }),
			qc.invalidateQueries({ queryKey: ["balance"] }),
			detail.refetch(),
		]);

	const paid = async () => {
		setBusy("paid");
		try {
			const fresh = await detail.refetch();
			await refresh();
			if (fresh.data?.payment_status === "paid")
				toast.success("Payment confirmed");
			else
				toast.info("Thank you", {
					description:
						"We confirm your payment as soon as it reaches our account.",
				});
		} finally {
			setBusy(null);
		}
	};

	const cancel = async () => {
		if (!o) return;
		setBusy("cancel");
		try {
			await api.orders.cancelByRef(o.id);
			await refresh();
			toast.success("Order cancelled");
		} catch (e) {
			toast.error("Not cancelled", {
				description: (e as Error)?.message || "Please try again.",
			});
		} finally {
			setBusy(null);
			setConfirmCancel(false);
		}
	};

	const fullPage = o ? (
		<Button
			variant="ghost"
			nativeButton={false}
			render={
				<Link to="/dashboard/orders/$orderId" params={{ orderId: o.id }} />
			}
		>
			Full details
		</Button>
	) : null;

	const footer = !o ? null : confirmCancel ? (
		<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
			<p className="flex-1 text-sm font-medium">
				Cancel this order? You can order again at any time.
			</p>
			<div className="flex gap-2">
				<Button
					variant="outline"
					onClick={() => setConfirmCancel(false)}
					disabled={busy !== null}
				>
					No
				</Button>
				<Button
					variant="destructive"
					onClick={() => void cancel()}
					disabled={busy !== null}
				>
					Cancel order
				</Button>
			</div>
		</div>
	) : unpaid ? (
		<>
			{fullPage}
			<Button
				variant="outline"
				onClick={() => setConfirmCancel(true)}
				disabled={busy !== null}
			>
				Cancel order
			</Button>
			<Button onClick={() => void paid()} disabled={busy !== null}>
				{busy === "paid" ? "Checking…" : "I've paid"}
			</Button>
		</>
	) : o.status === "loaded" || gone ? (
		<>
			{fullPage}
			<Button nativeButton={false} render={<Link to="/order/depot" />}>
				Order again
			</Button>
		</>
	) : (
		fullPage
	);

	return (
		<RecordDialog
			open={Boolean(order)}
			onOpenChange={(open) => {
				if (!open) {
					setConfirmCancel(false);
					onClose();
				}
			}}
			title={o ? `Order ${o.id}` : ""}
			subtitle={o ? [line?.name, o.depot_name].filter(Boolean).join(" · ") : ""}
			status={o ? orderStatusView(o) : undefined}
			badge={<ItemBadge kind="fuel" family={family} />}
			steps={steps}
			facts={
				o
					? [
							{
								label: "Quantity",
								value: litres(line?.quantity ?? 0),
								half: true,
							},
							{
								label: "Price per litre",
								value: line?.unit_price
									? `${formatNaira(line.unit_price)}/L`
									: null,
								half: true,
							},
							{
								label: "Total",
								value: formatNaira(o.total),
								half: true,
								money: gone ? "void" : unpaid ? "owed" : "paid",
							},
							{
								label: "Collection",
								value:
									o.loading?.type === "delivery"
										? "Delivery"
										: "Pickup at depot",
								half: true,
							},
							{
								label: "Paid so far",
								value: partPaid ? formatNaira(paidSoFar) : null,
								half: true,
								money: "paid",
							},
							{
								label: "Left to pay",
								value: partPaid ? formatNaira(left) : null,
								half: true,
								money: "owed",
							},
							{
								label: "Delivery address",
								value:
									o.loading?.type === "delivery"
										? [o.loading.address, o.loading.state]
												.filter(Boolean)
												.join(", ")
										: null,
							},
							{ label: "Order number", value: o.id, half: true },
							{
								label: "Ordered on",
								value: whenWords(o.placed_at),
								half: true,
							},
						]
					: []
			}
			footer={footer}
		>
			{unpaid && o?.account?.account_number ? (
				<PayIntoBox
					bankName={o.account.bank}
					accountNumber={o.account.account_number}
					accountName={o.account.account_name}
					amount={partPaid ? left : o.total}
					by={by}
					reference={o.id}
				/>
			) : null}
		</RecordDialog>
	);
}
