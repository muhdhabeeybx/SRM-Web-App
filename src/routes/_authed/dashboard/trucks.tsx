import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fuelFamily, ItemBadge } from "@/components/customer/record-dialog";
import { MICRO } from "@/components/dashboard/panel";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { SUPPORT_PHONE } from "@/lib/company";
import {
	customerApp,
	dayWords,
	litres,
	type PaymentTerms,
	productName,
	type TruckOnSale,
	type TruckRequest,
	zebra,
} from "@/lib/customer-app";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

/**
 * Buy a truck — Soroman's loaded trucks on sale, for a delivery customer.
 * As simple as the phone app (the owner, 13 Nov 2026): one list of trucks —
 * plate, fuel, where it is, litres — and a click opens the truck with the
 * request: litres, the price per litre offered, who it is for, where it is
 * going and when they pay. No PFI: that is staff's business.
 */
export const Route = createFileRoute("/_authed/dashboard/trucks")({
	component: TrucksPage,
	head: () => ({ meta: [{ title: "Buy a truck | Soroman Energy" }] }),
});

const digits = (v: string) => v.replace(/[^0-9.]/g, "");
const num = (v: string) => Number(digits(v)) || 0;

function TrucksPage() {
	const [open, setOpen] = useState<TruckOnSale | null>(null);
	const navigate = useNavigate();
	const qc = useQueryClient();
	const trucksQuery = useQuery({
		queryKey: ["trucks-on-sale"],
		queryFn: () => customerApp.trucks.onSale(),
	});
	const requestsQuery = useQuery({
		queryKey: ["truck-requests"],
		queryFn: () =>
			customerApp.trucks.myRequests().catch(() => [] as TruckRequest[]),
	});
	const asked = new Map(
		(requestsQuery.data ?? [])
			.filter((r) => r.status === "pending" || r.status === "countered")
			.map((r) => [r.loadingId, r]),
	);
	const data = trucksQuery.data;
	const trucks = data?.trucks ?? [];

	return (
		<div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-10 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<div className="flex items-center gap-4">
						<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
						<span className={cn(MICRO, "text-muted-foreground")}>Trucks</span>
					</div>
					<h1 className="mt-5 text-3xl leading-[1.05] tracking-tight md:text-4xl">
						Buy a{" "}
						<em className="font-semibold text-accent not-italic">truck</em>.
					</h1>
					<p className="mt-2.5 max-w-xl text-sm text-muted-foreground md:text-base">
						{trucks.length
							? `${trucks.length} ${trucks.length === 1 ? "truck" : "trucks"} on sale. Click a truck to ask for it at your price.`
							: "Soroman's loaded trucks on sale."}
					</p>
				</div>
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link to="/dashboard/orders" />}
				>
					My orders
				</Button>
			</header>

			<div className="mt-8">
				{trucksQuery.isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				) : !data?.linked ? (
					<div className="rounded-xl border p-8 text-center">
						<Truck className="mx-auto size-10 text-muted-foreground" />
						<p className="mt-3 text-lg font-semibold">
							Trucks are for delivery customers
						</p>
						<p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
							Your account is not linked to a Soroman delivery-customer account
							yet. Call us on{" "}
							<a
								href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
								className="font-medium text-accent"
							>
								{SUPPORT_PHONE}
							</a>{" "}
							and we will link it.
						</p>
					</div>
				) : trucks.length === 0 ? (
					<div className="rounded-xl border p-8 text-center">
						<Truck className="mx-auto size-10 text-muted-foreground" />
						<p className="mt-3 text-lg font-semibold">
							No trucks on sale right now
						</p>
						<p className="mt-2 text-sm text-muted-foreground">
							New trucks are added as they load.
						</p>
					</div>
				) : (
					<div className="overflow-hidden rounded-xl border">
						{trucks.map((t, i) => {
							const mine = asked.get(t.loadingId);
							return (
								<button
									type="button"
									key={t.loadingId}
									onClick={() => setOpen(t)}
									className={cn(
										"flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-accent/5",
										zebra(i),
										i > 0 && "border-t",
									)}
								>
									<ItemBadge kind="truck" family={fuelFamily(t.product)} />
									<div className="min-w-0 flex-1">
										<p className="font-semibold tracking-wide">
											{t.truckNumber}
										</p>
										<p className="truncate text-sm text-muted-foreground">
											{productName(t.product)} · {t.loadedAt}
										</p>
										{mine ? (
											<p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
												{mine.status === "countered"
													? "New price offered to you"
													: "You asked for this truck"}
											</p>
										) : null}
									</div>
									<span className="font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
										{litres(t.available)}
									</span>
									<ChevronRight className="size-4 text-muted-foreground" />
								</button>
							);
						})}
					</div>
				)}
			</div>

			<TruckDialog
				truck={open}
				buyerName={data?.buyer?.name ?? ""}
				request={open ? (asked.get(open.loadingId) ?? null) : null}
				onClose={() => setOpen(null)}
				onSent={(r) => {
					setOpen(null);
					void qc.invalidateQueries({ queryKey: ["truck-requests"] });
					void qc.invalidateQueries({ queryKey: ["trucks-on-sale"] });
					void navigate({
						to: "/dashboard/orders",
						search: r ? { truckRequest: r.id } : {},
					} as never);
				}}
				onSeeRequest={(r) => {
					setOpen(null);
					void navigate({
						to: "/dashboard/orders",
						search: { truckRequest: r.id },
					} as never);
				}}
				onStale={() => void trucksQuery.refetch()}
			/>
		</div>
	);
}

function TruckDialog({
	truck,
	buyerName,
	request,
	onClose,
	onSent,
	onSeeRequest,
	onStale,
}: {
	truck: TruckOnSale | null;
	buyerName: string;
	request: TruckRequest | null;
	onClose: () => void;
	onSent: (r: TruckRequest | null) => void;
	onSeeRequest: (r: TruckRequest) => void;
	onStale: () => void;
}) {
	const auth = useAuth();
	const myPhone = auth.status === "authed" ? auth.customer.phone : "";
	const [forId, setForId] = useState<number | null>(null);
	const [quantity, setQuantity] = useState("");
	const [rate, setRate] = useState("");
	const [customerName, setCustomerName] = useState("");
	const [customerPhone, setCustomerPhone] = useState("");
	const [destination, setDestination] = useState("");
	const [terms, setTerms] = useState<PaymentTerms>("on_delivery");
	const [notes, setNotes] = useState("");
	const [sending, setSending] = useState(false);

	// A fresh form for each truck: all its litres; name and phone from the account.
	if (truck && forId !== truck.loadingId) {
		setForId(truck.loadingId);
		setQuantity(String(Math.floor(truck.available)));
		setRate("");
		setNotes("");
		if (!customerName) setCustomerName(buyerName);
		if (!customerPhone) setCustomerPhone(myPhone);
	}

	const total = num(quantity) * num(rate);
	const problem = !truck
		? ""
		: !(num(quantity) > 0)
			? "Enter the litres"
			: num(quantity) > truck.available
				? `Only ${litres(truck.available)} left`
				: !(num(rate) > 0)
					? "Enter your price per litre"
					: !customerName.trim()
						? "Enter the customer name"
						: customerPhone.replace(/\D/g, "").length < 10
							? "Enter a phone number"
							: !destination.trim()
								? "Enter the destination"
								: "";

	const send = async () => {
		if (!truck || problem || sending) return;
		setSending(true);
		try {
			const res = await customerApp.trucks.ask({
				lines: [
					{
						loadingId: truck.loadingId,
						quantity: num(quantity),
						rate: num(rate),
					},
				],
				destination: destination.trim(),
				paymentTerms: terms,
				customerName: customerName.trim(),
				customerPhone: customerPhone.trim(),
				...(notes.trim() ? { notes: notes.trim() } : {}),
			});
			toast.success("Request sent", {
				description: `We will let you know once ${truck.truckNumber} is approved.`,
			});
			onSent(res.requests[0] ?? null);
		} catch (e) {
			toast.error("Not sent", {
				description: (e as Error)?.message || "Please try again.",
			});
			onStale();
		} finally {
			setSending(false);
		}
	};

	const field = "space-y-1.5";
	return (
		<Dialog open={Boolean(truck)} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-h-[90dvh] gap-0 overflow-hidden sm:max-w-lg">
				{truck ? (
					<>
						<DialogHeader className="border-b px-6 pt-6 pb-4">
							<div className="flex items-center gap-3 pr-8">
								<ItemBadge kind="truck" family={fuelFamily(truck.product)} />
								<DialogTitle className="text-xl font-semibold">
									{truck.truckNumber}
								</DialogTitle>
							</div>
							<DialogDescription>
								{productName(truck.product)}
							</DialogDescription>
						</DialogHeader>
						<div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs tracking-wide text-muted-foreground uppercase">
										Where it is
									</p>
									<p className="mt-0.5 font-semibold">{truck.loadedAt}</p>
								</div>
								<div>
									<p className="text-xs tracking-wide text-muted-foreground uppercase">
										Litres on it
									</p>
									<p className="mt-0.5 font-semibold">
										{litres(truck.available)}
									</p>
								</div>
								<div>
									<p className="text-xs tracking-wide text-muted-foreground uppercase">
										Loaded on
									</p>
									<p className="mt-0.5 font-semibold">
										{dayWords(truck.loadedOn) || "—"}
									</p>
								</div>
							</div>

							{request ? (
								<p className="rounded-lg bg-amber-500/10 p-3 text-sm font-medium">
									{request.status === "countered"
										? "Soroman has sent you a new price for this truck. Open your request to accept or decline it."
										: "You have already asked for this truck. We will let you know once it is approved."}
								</p>
							) : (
								<div className="space-y-4 border-t pt-4">
									<div className="grid grid-cols-2 gap-3">
										<div className={field}>
											<Label htmlFor="t-qty">Litres you want</Label>
											<Input
												id="t-qty"
												inputMode="numeric"
												value={quantity}
												onChange={(e) => setQuantity(digits(e.target.value))}
											/>
										</div>
										<div className={field}>
											<Label htmlFor="t-rate">Your price per litre (₦)</Label>
											<Input
												id="t-rate"
												inputMode="decimal"
												placeholder="e.g. 1300"
												value={rate}
												onChange={(e) => setRate(digits(e.target.value))}
											/>
										</div>
									</div>
									<div className={field}>
										<Label htmlFor="t-name">Customer name</Label>
										<Input
											id="t-name"
											value={customerName}
											onChange={(e) => setCustomerName(e.target.value)}
											placeholder="Name the request is in"
										/>
									</div>
									<div className={field}>
										<Label htmlFor="t-phone">Phone number</Label>
										<Input
											id="t-phone"
											inputMode="tel"
											value={customerPhone}
											onChange={(e) => setCustomerPhone(e.target.value)}
											placeholder="We text the driver's details here"
										/>
									</div>
									<div className={field}>
										<Label htmlFor="t-dest">Destination</Label>
										<Input
											id="t-dest"
											value={destination}
											onChange={(e) => setDestination(e.target.value)}
											placeholder="Town or station it is going to"
										/>
									</div>
									<div className={field}>
										<Label>When will you pay?</Label>
										<div className="grid grid-cols-2 gap-2">
											{(
												[
													["on_delivery", "On delivery"],
													["before_delivery", "Before delivery"],
												] as const
											).map(([key, text]) => (
												<button
													type="button"
													key={key}
													onClick={() => setTerms(key)}
													aria-pressed={terms === key}
													className={cn(
														"rounded-full border px-3 py-2 text-sm font-semibold transition-colors",
														terms === key
															? "border-accent bg-accent/10 text-accent"
															: "hover:bg-muted",
													)}
												>
													{text}
												</button>
											))}
										</div>
									</div>
									<div className={field}>
										<Label htmlFor="t-notes">Anything else? (optional)</Label>
										<Input
											id="t-notes"
											value={notes}
											onChange={(e) => setNotes(e.target.value)}
											placeholder="A message for us"
										/>
									</div>
								</div>
							)}
						</div>
						<DialogFooter className="flex-col gap-2 border-t px-6 py-4 sm:flex-col">
							{request ? (
								<Button onClick={() => onSeeRequest(request)}>
									See my request
								</Button>
							) : (
								<>
									{total > 0 && !problem ? (
										<p className="text-center text-sm font-semibold">
											{litres(num(quantity))} at {formatNaira(num(rate))}/L ={" "}
											{formatNaira(total)}
										</p>
									) : null}
									<Button
										onClick={() => void send()}
										disabled={Boolean(problem) || sending}
									>
										{sending ? "Sending…" : problem || "Request this truck"}
									</Button>
								</>
							)}
						</DialogFooter>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
