import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	approvalWords,
	customerApp,
	dayWords,
	litres,
	productName,
	requestStatus,
	type TruckRequest,
	whenWords,
} from "@/lib/customer-app";
import { formatNaira } from "@/lib/use-catalog";
import {
	fuelFamily,
	ItemBadge,
	type PanelStep,
	PayIntoBox,
	RecordDialog,
} from "./record-dialog";

/**
 * A truck request, opened from Orders — the same layout as a depot order.
 * Plain terms only: Pending approval, Price offered, Approved · unpaid, Part
 * paid, Completed (read off Soroman's Sales Ledger), Rejected, Declined,
 * Cancelled. Paid on delivery; once approved, the account to pay into shows
 * every time it is opened, until paid in full — as in the phone app.
 */

function steps(r: TruckRequest): PanelStep[] {
	const sent: PanelStep = {
		title: "Request sent",
		detail: whenWords(r.createdAt),
		state: "done",
	};
	const review: PanelStep = (() => {
		switch (r.status) {
			case "pending":
				// Three approvals (19 Nov 2026): zonal coordinator, CFO, final.
				return {
					title: r.stage
						? `Approval ${Math.min(3, (r.stepsDone ?? 0) + 1)} of 3`
						: "Pending approval",
					detail: approvalWords(r),
					state: "now",
				};
			case "countered":
				return {
					title: "Price offered",
					detail: `${formatNaira(r.counterRate ?? 0)}/L — accept or decline it below`,
					state: "action",
				};
			case "approved":
				return {
					title: "Reviewed",
					detail: whenWords(r.decidedAt),
					state: "done",
				};
			case "rejected":
				return {
					title: "Rejected",
					detail: "The litres went back on sale",
					state: "failed",
				};
			case "declined":
				return {
					title: "Declined",
					detail: "You declined the price offered",
					state: "failed",
				};
			default:
				return {
					title: "Cancelled",
					detail: "You cancelled the request",
					state: "failed",
				};
		}
	})();
	if (review.state === "failed") return [sent, review];
	const approved: PanelStep =
		r.status === "approved"
			? {
					title: "Approved",
					detail: "The truck is yours — paid for on delivery",
					state: "done",
				}
			: { title: "Approved", state: "later" };
	const pay = r.payment;
	const paid: PanelStep =
		r.status !== "approved" || !pay
			? { title: "Paid", state: "later" }
			: pay.state === "paid"
				? {
						title: "Completed",
						detail: `${formatNaira(pay.paid)} paid in full`,
						state: "done",
					}
				: pay.state === "part_paid"
					? {
							title: "Part paid",
							detail: `${formatNaira(pay.paid)} paid · ${formatNaira(pay.toPay ?? pay.outstanding)} still to pay${dueText(pay)}`,
							state: "now",
						}
					: {
							title: "Pay on delivery",
							detail: `${formatNaira(pay.toPay ?? pay.outstanding)} to pay${dueText(pay)}`,
							state: "now",
						};
	return [sent, review, approved, paid];
}

/** " · pay by 26 Nov 2026", or " · overdue since …, interest added" (19 Nov 2026). */
function dueText(pay: NonNullable<TruckRequest["payment"]>): string {
	if (!pay.dueOn) return "";
	const day = dayWords(`${pay.dueOn}T12:00:00`);
	return pay.overdue
		? ` · overdue since ${day}, interest added`
		: ` · pay by ${day}`;
}

type Action = "accept" | "decline" | "cancel";

export function TruckRequestDialog({
	request: r,
	onClose,
	onChanged,
}: {
	request: TruckRequest | null;
	onClose: () => void;
	onChanged: (r: TruckRequest) => void;
}) {
	const [confirming, setConfirming] = useState<Action | null>(null);
	const [busy, setBusy] = useState(false);

	const act = async (kind: Action) => {
		if (!r) return;
		setBusy(true);
		try {
			const updated = await customerApp.trucks[kind](r.id);
			onChanged(updated);
			toast.success(
				kind === "accept"
					? `${r.truckNumber} approved`
					: kind === "decline"
						? "Price declined"
						: "Request cancelled",
				kind === "accept"
					? { description: "Where to pay is on the request." }
					: undefined,
			);
		} catch (e) {
			toast.error("Not done", {
				description: (e as Error)?.message || "Please try again.",
			});
		} finally {
			setBusy(false);
			setConfirming(null);
		}
	};

	const question: Record<Action, string> = {
		accept: r
			? `Accept ${formatNaira(r.counterRate ?? 0)} per litre — ${formatNaira(r.counterAmount ?? 0)} in total?`
			: "",
		decline: "Decline the price offered? The litres go back on sale.",
		cancel: "Cancel this request? The litres go back on sale.",
	};

	const footer = !r ? null : confirming ? (
		<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
			<p className="flex-1 text-sm font-medium">{question[confirming]}</p>
			<div className="flex gap-2">
				<Button
					variant="outline"
					onClick={() => setConfirming(null)}
					disabled={busy}
				>
					No
				</Button>
				<Button
					variant={confirming === "accept" ? "default" : "destructive"}
					onClick={() => void act(confirming)}
					disabled={busy}
				>
					{confirming === "accept" ? "Yes, accept" : "Yes"}
				</Button>
			</div>
		</div>
	) : r.status === "countered" ? (
		<>
			<Button variant="outline" onClick={() => setConfirming("decline")}>
				Decline
			</Button>
			<Button onClick={() => setConfirming("accept")}>Accept price</Button>
		</>
	) : r.status === "pending" ? (
		<Button variant="outline" onClick={() => setConfirming("cancel")}>
			Cancel request
		</Button>
	) : r.status === "approved" &&
		r.payment?.state !== "paid" &&
		r.driverPhone ? (
		<Button nativeButton={false} render={<a href={`tel:${r.driverPhone}`} />}>
			Call the driver{r.driverName ? `, ${r.driverName}` : ""}
		</Button>
	) : null;

	const price =
		r?.status === "countered" ? (r.counterRate ?? r.rate) : (r?.rate ?? 0);
	const total =
		r?.status === "countered"
			? (r.counterAmount ?? r.amount)
			: (r?.amount ?? 0);
	const status = r ? requestStatus(r) : undefined;

	return (
		<RecordDialog
			open={Boolean(r)}
			onOpenChange={(open) => {
				if (!open) {
					setConfirming(null);
					onClose();
				}
			}}
			title={r ? `Truck ${r.truckNumber}` : ""}
			subtitle={
				r
					? [productName(r.product), r.destination ? `to ${r.destination}` : ""]
							.filter(Boolean)
							.join(" · ")
					: ""
			}
			status={status}
			badge={
				r ? <ItemBadge kind="truck" family={fuelFamily(r.product)} /> : null
			}
			steps={r ? steps(r) : []}
			facts={
				r
					? [
							{ label: "Quantity", value: litres(r.quantity), half: true },
							{
								label:
									r.status === "countered"
										? "Price offered"
										: "Price per litre",
								value: `${formatNaira(price)}/L`,
								half: true,
							},
							{
								label: "Total",
								value: formatNaira(r.payment?.amount ?? total),
								half: true,
								money: ["rejected", "declined", "cancelled"].includes(r.status)
									? "void"
									: "plain",
							},
							{ label: "Payment", value: "On delivery", half: true },
							{
								label: "Paid",
								value: r.payment ? formatNaira(r.payment.paid) : null,
								half: true,
								money: r.payment?.paid ? "paid" : "plain",
							},
							{
								label: "Still to pay",
								value: r.payment ? formatNaira(r.payment.outstanding) : null,
								half: true,
								money:
									r.payment && r.payment.outstanding > 0.5 ? "owed" : "paid",
							},
							// Pay by the due day; after it, interest on top (19 Nov 2026).
							{
								label: r.payment?.overdue ? "Was due" : "Pay by",
								value:
									r.payment?.dueOn && r.payment.state !== "paid"
										? dayWords(`${r.payment.dueOn}T12:00:00`)
										: null,
								half: true,
								money: r.payment?.overdue ? "owed" : "plain",
							},
							{
								label: "Interest",
								value:
									r.payment && (r.payment.interest ?? 0) > 0.5
										? formatNaira(r.payment.interest ?? 0)
										: null,
								half: true,
								money: "owed",
							},
							{
								label: "Total to pay",
								value:
									r.payment && (r.payment.interest ?? 0) > 0.5
										? formatNaira(r.payment.toPay ?? 0)
										: null,
								money: "owed",
							},
							{
								label: "Your price",
								value:
									r.status === "countered" ? `${formatNaira(r.rate)}/L` : null,
							},
							{
								label: "Note from Soroman",
								value: r.status === "countered" ? r.counterNote : null,
							},
							{ label: "Customer", value: r.customerName, half: true },
							{ label: "Phone number", value: r.customerPhone, half: true },
							{ label: "Destination", value: r.destination },
							// Theirs to call once they have asked (the owner, 15 Nov 2026).
							{
								label: "Driver",
								value: r.driverPhone
									? [r.driverName, r.driverPhone].filter(Boolean).join(" · ")
									: null,
							},
							{ label: "Request number", value: r.requestRef, half: true },
							{
								label: "Requested on",
								value: whenWords(r.createdAt),
								half: true,
							},
						]
					: []
			}
			footer={footer}
		>
			{r?.status === "approved" &&
			r.payment?.account?.accountNumber &&
			r.payment.state !== "paid" ? (
				<PayIntoBox
					bankName={r.payment.account.bankName}
					accountNumber={r.payment.account.accountNumber}
					accountName={r.payment.account.accountName}
					amount={r.payment.toPay ?? r.payment.outstanding}
					reference={r.payment.orderNo}
				/>
			) : null}
			{r?.status === "approved" && r.payment && r.payment.amount > 0 ? (
				// How much of it is paid, at a glance: green paid, red still to pay.
				<div className="space-y-1.5">
					<div
						className={
							r.payment.outstanding > 0.5
								? "h-2.5 overflow-hidden rounded-full bg-red-600/15"
								: "h-2.5 overflow-hidden rounded-full bg-emerald-600/15"
						}
					>
						<div
							className="h-full rounded-full bg-emerald-600"
							style={{
								width: `${Math.min(100, Math.round((r.payment.paid / r.payment.amount) * 100))}%`,
							}}
						/>
					</div>
					<p
						className={
							r.payment.outstanding > 0.5
								? "text-sm font-semibold text-red-600 dark:text-red-400"
								: "text-sm font-semibold text-emerald-700 dark:text-emerald-400"
						}
					>
						{r.payment.state === "paid"
							? "Paid in full"
							: `${Math.round((r.payment.paid / r.payment.amount) * 100)}% paid · ${formatNaira(r.payment.outstanding)} still to pay`}
					</p>
				</div>
			) : null}
		</RecordDialog>
	);
}
