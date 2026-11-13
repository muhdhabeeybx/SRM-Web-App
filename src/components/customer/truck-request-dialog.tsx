import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	customerApp,
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
 * Plain terms only: Pending approval, Price offered, Approved, Rejected,
 * Declined, Cancelled.
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
				return {
					title: "Pending approval",
					detail: "Soroman is reviewing your request",
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
	return [
		sent,
		review,
		r.status === "approved"
			? {
					title: "Approved",
					detail: r.payment?.account
						? `Pay ${formatNaira(r.payment.amount)} into the account below`
						: "We have texted you the driver and where to pay",
					state: "done",
				}
			: { title: "Approved", state: "later" },
	];
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
					? {
							description:
								"Pay into the account shown. We will text you the driver.",
						}
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
	) : r.status === "approved" && r.driverPhone ? (
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
				r ? [productName(r.product), r.depot].filter(Boolean).join(" · ") : ""
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
								value: formatNaira(total),
								half: true,
								money:
									r.status === "approved"
										? "owed"
										: ["rejected", "declined", "cancelled"].includes(r.status)
											? "void"
											: "plain",
							},
							{ label: "Payment", value: r.paymentTermsLabel, half: true },
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
							{
								label: "Driver",
								value:
									r.status === "approved"
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
			{r?.status === "approved" && r.payment?.account ? (
				<PayIntoBox
					bankName={r.payment.account.bankName}
					accountNumber={r.payment.account.accountNumber}
					accountName={r.payment.account.accountName}
					amount={r.payment.amount}
					reference={r.payment.orderNo}
				/>
			) : null}
		</RecordDialog>
	);
}
