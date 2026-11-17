import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Lock, MapPin, Truck } from "lucide-react";
import type React from "react";
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
import { SUPPORT_PHONE } from "@/lib/company";
import {
	customerApp,
	litres,
	NO_PLACE,
	placesOf,
	goingToText,
	productName,
	type TruckOnSale,
	type TruckRequest,
	withCommas,
} from "@/lib/customer-app";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

/**
 * Buy a truck — Soroman's loaded trucks on sale, for a delivery customer.
 * As the phone app has it (the owner, 15 Nov 2026): the locations trucks are
 * going to first, then the trucks going to the one picked — plate, fuel,
 * driver, litres; never where it loaded — and a click opens the truck: where
 * it is going, its litres, its driver and the driver's phone (hidden until
 * they ask), and the request — litres, price per litre, the customer and
 * their phone, the discharge location. Always paid on delivery. No PFI.
 *
 * The location picked is in the address (?at=), so the browser's Back goes
 * from a location's trucks to the locations, as Android's back does.
 */
export const Route = createFileRoute("/_authed/dashboard/trucks")({
	component: TrucksPage,
	validateSearch: (s: Record<string, unknown>): { at?: string } =>
		typeof s.at === "string" ? { at: s.at } : {},
	head: () => ({ meta: [{ title: "Buy a truck | Soroman Energy" }] }),
});

const digits = (v: string) => v.replace(/[^0-9.]/g, "");
const num = (v: string) => Number(digits(v)) || 0;

function TrucksPage() {
	const [open, setOpen] = useState<TruckOnSale | null>(null);
	const { at } = Route.useSearch();
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
	const all = data?.trucks ?? [];
	const places = placesOf(all);
	// "-" in the address is the trucks with no location yet.
	const placeKey = at === undefined ? null : at === "-" ? "" : at;
	const place =
		placeKey === null ? null : (places.find((p) => p.key === placeKey) ?? null);
	const placeName = place?.name ?? "";
	const trucks = place?.trucks ?? [];
	const goTo = (key: string | null) =>
		void navigate({
			to: "/dashboard/trucks",
			search: key === null ? {} : { at: key || "-" },
		});

	return (
		<div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-10 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					{placeKey !== null ? (
						<button
							type="button"
							onClick={() => goTo(null)}
							className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
						>
							<ArrowLeft className="size-4" />
							All locations
						</button>
					) : (
						<div className="flex items-center gap-4">
							<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
							<span className={cn(MICRO, "text-muted-foreground")}>Trucks</span>
						</div>
					)}
					<h1 className="mt-5 text-3xl leading-[1.05] tracking-tight md:text-4xl">
						{placeKey === null ? (
							<>
								Buy a{" "}
								<em className="font-semibold text-accent not-italic">truck</em>.
							</>
						) : (
							placeName || "Trucks"
						)}
					</h1>
					<p className="mt-2.5 max-w-xl text-sm text-muted-foreground md:text-base">
						{placeKey === null
							? "Pick the location you want the product, then a truck going there."
							: `${trucks.length} ${trucks.length === 1 ? "truck" : "trucks"} ${placeKey ? `going to ${placeName}` : "without a location yet"}. Click one to see it and send your price.`}
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
				) : placeKey === null ? (
					places.length === 0 ? (
						// A state sales rep sees only trucks going to their states
						// (17 Nov 2026): with none set, say so rather than "no trucks".
						data?.buyer?.states && data.buyer.states.length === 0 ? (
							<Empty
								title="No location set for you yet"
								body="Soroman has not set the states you sell in. Call us and we will set them."
							/>
						) : (
							<Empty
								title="No trucks on sale right now"
								body="New trucks are added as they load."
							/>
						)
					) : (
						<>
							{/* No litres totals (the owner, 15 Nov 2026): a buyer
							    chooses a truck, and sees its litres inside its location. */}
							<Figures
								figures={[
									["Trucks", String(all.length)],
									["Locations", String(places.filter((p) => p.key).length)],
								]}
							/>
							<p className={cn(MICRO, "mt-8 text-muted-foreground")}>
								Locations
							</p>
							<div className="mt-2">
								{places.map((p, i) => (
									<button
										type="button"
										key={p.key || "-"}
										onClick={() => goTo(p.key)}
										className={cn(
											"flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-accent/5",
											i > 0 && "border-t",
										)}
									>
										<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
											<MapPin className="size-4" />
										</span>
										<div className="min-w-0 flex-1">
											<p className="font-semibold">{p.name}</p>
											<p className="truncate text-sm text-muted-foreground">
												{[
													p.area,
													[
														...new Set(
															p.trucks.map((t) => productName(t.product)),
														),
													].join(", "),
												]
													.filter(Boolean)
													.join(" · ")}
											</p>
										</div>
										<span className="font-semibold tabular-nums">
											{p.trucks.length}{" "}
											{p.trucks.length === 1 ? "truck" : "trucks"}
										</span>
										<ChevronRight className="size-4 text-muted-foreground" />
									</button>
								))}
							</div>
						</>
					)
				) : trucks.length === 0 ? (
					<Empty
						title={`No trucks for ${placeName || NO_PLACE} now`}
						body="They have all been asked for. Go back to pick another location."
					/>
				) : (
					<div>
						{trucks.map((t, i) => {
							const mine = asked.get(t.loadingId);
							return (
								<button
									type="button"
									key={t.loadingId}
									onClick={() => setOpen(t)}
									className={cn(
										"flex w-full items-center gap-4 py-3.5 text-left transition-colors hover:bg-accent/5",
										i > 0 && "border-t",
									)}
								>
									<ItemBadge kind="truck" family={fuelFamily(t.product)} />
									<div className="min-w-0 flex-1">
										<p className="font-semibold tracking-wide">
											{t.truckNumber}
										</p>
										<p className="truncate text-sm text-muted-foreground">
											{productName(t.product)}
											{t.driverName ? ` · ${t.driverName}` : ""}
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

function Empty({ title, body }: { title: string; body: string }) {
	return (
		<div className="py-12 text-center">
			<Truck className="mx-auto size-10 text-muted-foreground" />
			<p className="mt-3 text-lg font-semibold">{title}</p>
			<p className="mt-2 text-sm text-muted-foreground">{body}</p>
		</div>
	);
}

/** The figures that matter, in a row with hairlines between. */
function Figures({ figures }: { figures: [string, string][] }) {
	return (
		<div className="flex border-y">
			{figures.map(([label, value], i) => (
				<div
					key={label}
					className={cn("flex-1 py-3", i === 0 ? "pr-3" : "border-l px-3")}
				>
					<p className={cn(MICRO, "text-muted-foreground")}>{label}</p>
					<p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
				</div>
			))}
		</div>
	);
}

function TruckDialog({
	truck,
	request,
	onClose,
	onSent,
	onSeeRequest,
	onStale,
}: {
	truck: TruckOnSale | null;
	request: TruckRequest | null;
	onClose: () => void;
	onSent: (r: TruckRequest | null) => void;
	onSeeRequest: (r: TruckRequest) => void;
	onStale: () => void;
}) {
	const [forId, setForId] = useState<number | null>(null);
	const [quantity, setQuantity] = useState("");
	const [rate, setRate] = useState("");
	const [customerName, setCustomerName] = useState("");
	const [customerPhone, setCustomerPhone] = useState("");
	// Where it is discharged — a station or address, always asked (the owner,
	// 15 Nov 2026). It can be anywhere, not only the truck's town.
	const [destination, setDestination] = useState("");
	const [notes, setNotes] = useState("");
	const [sending, setSending] = useState(false);

	// A fresh form for each truck: all its litres. The buyer's name and phone
	// are typed every time, never filled from the account (the owner, 17 Nov
	// 2026: "so that they can put the real phone and name").
	if (truck && forId !== truck.loadingId) {
		setForId(truck.loadingId);
		setQuantity(withCommas(String(Math.floor(truck.available))));
		setRate("");
		setNotes("");
		setCustomerName("");
		setCustomerPhone("");
	}

	const qty = num(quantity);
	const price = num(rate);
	const total = qty * price;
	const problem = !truck
		? ""
		: !(qty > 0)
			? "Enter the litres you want"
			: qty > truck.available
				? `Only ${litres(truck.available)} on this truck`
				: !(price > 0)
					? "Enter your price per litre"
					: !customerName.trim()
						? "Enter the customer's name"
						: customerPhone.replace(/\D/g, "").length < 10
							? "Enter the customer's phone number"
							: !destination.trim()
								? "Enter the discharge location"
								: "";

	const send = async () => {
		if (!truck || problem || sending) return;
		setSending(true);
		try {
			const res = await customerApp.trucks.ask({
				lines: [
					{
						loadingId: truck.loadingId,
						quantity: qty,
						rate: price,
					},
				],
				destination: destination.trim(),
				// Always pay on delivery (the owner, 15 Nov 2026) — nothing to choose.
				paymentTerms: "on_delivery",
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
	// The driver's number: theirs once they have asked; until then hidden.
	const driverPhone = request?.driverPhone || "";
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
								{productName(truck.product)} truck
							</DialogDescription>
						</DialogHeader>
						<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
							{/* The truck: where it is going, how much is on it, who drives it. */}
							<div className="grid grid-cols-2 border-y">
								<Fact label="Truck location" value={goingToText(truck)} />
								<Fact label="Quantity" value={litres(truck.available)} last />
								<Fact
									label="Driver"
									value={truck.driverName || "Not named yet"}
									top
								/>
								<Fact
									label="Driver's phone"
									top
									last
									value={
										driverPhone ? (
											<a
												href={`tel:${driverPhone.replace(/[^\d+]/g, "")}`}
												className="text-accent hover:underline"
											>
												{driverPhone}
											</a>
										) : truck.driverPhoneMasked ? (
											<>
												<span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 whitespace-nowrap select-none">
													<Lock className="size-3.5 text-muted-foreground" />
													<span className="blur-[5px]" aria-hidden>
														{truck.driverPhoneMasked}
													</span>
												</span>
												<span className="mt-1 block text-xs font-medium text-muted-foreground">
													Shown when you send a request
												</span>
											</>
										) : (
											"Not given yet"
										)
									}
								/>
							</div>

							{request ? (
								<p className="rounded-lg bg-amber-500/10 p-3 text-sm font-medium">
									{request.status === "countered"
										? "Soroman has sent you a new price for this truck. Open your request to accept or decline it."
										: "You have asked for this truck. We will let you know once it is approved."}
								</p>
							) : (
								<div className="space-y-4">
									<p className="text-lg font-semibold">Your request</p>
									<div className="grid grid-cols-2 gap-3">
										<div className={field}>
											<Label htmlFor="t-qty">Litres you want</Label>
											<Input
												id="t-qty"
												inputMode="numeric"
												value={quantity}
												onChange={(e) =>
													setQuantity(withCommas(e.target.value))
												}
											/>
										</div>
										<div className={field}>
											<Label htmlFor="t-rate">Price per litre (₦)</Label>
											<Input
												id="t-rate"
												inputMode="decimal"
												placeholder="1,300"
												value={rate}
												onChange={(e) => setRate(withCommas(e.target.value))}
											/>
										</div>
									</div>
									<div className={field}>
										<Label htmlFor="t-name">Customer name</Label>
										<Input
											id="t-name"
											value={customerName}
											onChange={(e) => setCustomerName(e.target.value)}
											placeholder="The buyer's full name"
										/>
									</div>
									<div className={field}>
										<Label htmlFor="t-phone">Customer phone number</Label>
										<Input
											id="t-phone"
											inputMode="tel"
											value={customerPhone}
											onChange={(e) => setCustomerPhone(e.target.value)}
											placeholder="The buyer's phone, e.g. 0803 123 4567"
										/>
									</div>
									<div className={field}>
										<Label htmlFor="t-dest">Discharge location</Label>
										<Input
											id="t-dest"
											value={destination}
											onChange={(e) => setDestination(e.target.value)}
											placeholder="Station or address"
										/>
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
									{/* The sum, live as they type: what they would pay, on delivery. */}
									<div className="flex flex-col gap-1 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
										<div className="min-w-0 flex-1">
											<p className="text-[11px] font-semibold tracking-wider whitespace-nowrap text-accent">
												TOTAL · PAY ON DELIVERY
											</p>
											<p className="mt-0.5 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
												{qty > 0 ? litres(qty) : "— L"}
												<span className="text-muted-foreground/60"> × </span>
												{price > 0 ? `${formatNaira(price)}/L` : "your price"}
											</p>
										</div>
										<p
											className={cn(
												"text-2xl font-semibold whitespace-nowrap tabular-nums sm:ml-auto",
												total > 0 ? "text-accent" : "text-muted-foreground/60",
											)}
										>
											{total > 0 ? formatNaira(total) : "₦0"}
										</p>
									</div>
									{problem ? (
										<p className="text-center text-sm font-semibold text-amber-700 dark:text-amber-400">
											{problem}
										</p>
									) : null}
									<Button
										onClick={() => void send()}
										disabled={Boolean(problem) || sending}
									>
										{sending ? "Sending…" : "Send request"}
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

function Fact({
	label,
	value,
	last = false,
	top = false,
}: {
	label: string;
	value: React.ReactNode;
	last?: boolean;
	top?: boolean;
}) {
	return (
		<div
			className={cn(
				"py-3 pr-3",
				!last && "border-r",
				last && "pl-3",
				top && "border-t",
			)}
		>
			<p className={cn(MICRO, "text-muted-foreground")}>{label}</p>
			<div className="mt-1 text-[17px] font-semibold">{value}</div>
		</div>
	);
}
