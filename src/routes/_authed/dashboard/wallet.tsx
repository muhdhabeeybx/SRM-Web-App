import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ItemBadge } from "@/components/customer/record-dialog";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SUPPORT_WHATSAPP_URL } from "@/lib/company";
import {
	type BalancePayment,
	customerApp,
	dayWords,
	MONEY,
	netWords,
} from "@/lib/customer-app";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

/**
 * Balance — where the customer stands on their orders, and their payments.
 * Replaced the wallet (the owner, 13 Nov 2026): the wallet paid for nothing
 * once orders moved to their own accounts. Same as the phone app's Balance:
 * Outstanding balance in red, Overpayment in green, then every payment the
 * finance team has matched — a short searchable list, details on click.
 *
 * The address stays /dashboard/wallet so links and notifications still land.
 */
export const Route = createFileRoute("/_authed/dashboard/wallet")({
	component: BalancePage,
	head: () => ({
		meta: [
			{ title: "Balance | Soroman Energy" },
			{
				name: "description",
				content: "What you have paid, and what is left to pay on your orders.",
			},
		],
	}),
});

const naira = (n: number) => formatNaira(Math.abs(n));
const signed = (n: number) => `${n < 0 ? "−" : "+"}${naira(n)}`;

const paidFor = (p: BalancePayment) =>
	[
		p.orderNumber && `Order ${p.orderNumber}`,
		p.product,
		p.quantity
			? `${Math.round(p.quantity).toLocaleString("en-NG")} ${/lit(re|er)/i.test(p.unit || "L") ? "L" : p.unit}`
			: "",
	]
		.filter(Boolean)
		.join(" · ");

/** Everything a payment can be found by: amount, date, order, bank, reference… */
const searchText = (p: BalancePayment) =>
	[
		String(Math.abs(p.amount)),
		dayWords(p.date),
		p.kind,
		paidFor(p),
		p.paidInto?.bank,
		p.paidInto?.accountName,
		p.paidInto?.accountNumber,
		p.description,
		p.from,
		p.reference,
		p.movedWith,
	]
		.filter(Boolean)
		.join(" ")
		.replace(/,/g, "")
		.toLowerCase();

function BalancePage() {
	const [search, setSearch] = useState("");
	const [open, setOpen] = useState<BalancePayment | null>(null);
	const query = useQuery({
		queryKey: ["balance"],
		queryFn: () => customerApp.balance(),
		// Read again whenever they come back to the page, as the app does on focus.
		refetchOnWindowFocus: "always",
		refetchOnMount: "always",
	});
	const b = query.data;
	const words = b ? netWords(b.net) : null;

	const indexed = useMemo(
		() => (b?.payments ?? []).map((p) => ({ p, text: searchText(p) })),
		[b],
	);
	const shown = useMemo(() => {
		const terms = search
			.toLowerCase()
			.replace(/[₦,]/g, " ")
			.split(/\s+/)
			.filter(Boolean);
		if (!terms.length) return indexed.map((x) => x.p);
		return indexed
			.filter((x) => terms.every((t) => x.text.includes(t)))
			.map((x) => x.p);
	}, [indexed, search]);

	const total = b?.payments.length ?? 0;

	return (
		<div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6 md:pt-8 md:pb-14 lg:px-8">
			<header className="snapshot-rise flex flex-wrap items-end justify-between gap-4">
				<div>
					<div className="flex items-center gap-4">
						<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
						<span className={cn(MICRO, "text-muted-foreground")}>Balance</span>
					</div>
					<h1 className="mt-5 text-3xl leading-[1.05] tracking-tight md:text-4xl">
						Your{" "}
						<em className="font-semibold text-accent not-italic">balance</em>.
					</h1>
					<p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
						What you have paid, and what is left to pay.
					</p>
				</div>
				{b && (b.outstanding > 0.5 || (b.trucks?.outstanding ?? 0) > 0.5) ? (
					<Button nativeButton={false} render={<Link to="/dashboard/orders" />}>
						See what is unpaid
					</Button>
				) : null}
			</header>

			<div className="snapshot-rise mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
				<section className="overflow-hidden rounded-xl bg-zinc-950 px-6 py-6 text-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:border dark:border-white/10 dark:bg-zinc-900">
					{query.isLoading ? (
						<Skeleton className="h-12 w-48 bg-white/10" />
					) : words && b ? (
						<>
							<span className="text-xs font-semibold tracking-[0.25em] text-white/60 uppercase">
								{words.title}
							</span>
							<p
								className={cn(
									"mt-3 text-4xl font-semibold tracking-tight tabular-nums",
									words.kind === "outstanding" && "text-red-400",
									words.kind === "overpayment" && "text-emerald-400",
								)}
							>
								{naira(b.net)}
							</p>
							<p className="mt-2 text-sm text-white/70">
								{(() => {
									// How the one figure is reached, when it has more than one part.
									const owed = [
										b.outstanding > 0.5
											? `${naira(b.outstanding)} on orders`
											: "",
										(b.trucks?.outstanding ?? 0) > 0.5
											? `${naira(b.trucks?.outstanding ?? 0)} on trucks`
											: "",
									].filter(Boolean);
									const over = b.surplus + (b.trucks?.surplus ?? 0);
									if (owed.length > 1 || (owed.length && over > 0.5)) {
										return `${owed.join(" + ")} unpaid${over > 0.5 ? `, less ${naira(over)} overpaid` : ""}`;
									}
									return words.caption;
								})()}
							</p>
						</>
					) : (
						<p className="text-sm text-white/70">
							Your balance could not be loaded.
						</p>
					)}
				</section>

				<section
					className={cn(PANEL, "divide-y px-6 py-2")}
					aria-label="Figures"
				>
					{[
						[
							"Unpaid on orders",
							b?.outstanding,
							b && b.outstanding > 0.5 ? MONEY.owed : "",
						],
						// A delivery customer's trucks, in the same one balance (15 Nov 2026).
						...(b?.trucks
							? [
									[
										`Unpaid on trucks (${b.trucks.count})`,
										b.trucks.outstanding,
										b.trucks.outstanding > 0.5 ? MONEY.owed : "",
									],
								]
							: []),
						[
							"Overpaid on orders",
							b?.surplus,
							b && b.surplus > 0.5 ? MONEY.paid : "",
						],
						[
							"Total paid",
							b ? b.received + (b.trucks?.paid ?? 0) : undefined,
							"",
						],
						[
							"Total bought",
							b ? b.ordered + (b.trucks?.bought ?? 0) : undefined,
							"",
						],
					].map(([label, value, tone]) => (
						<div
							key={label as string}
							className="flex items-center justify-between py-3"
						>
							<span className="font-medium">{label as string}</span>
							{query.isLoading ? (
								<Skeleton className="h-5 w-24" />
							) : (
								<span
									className={cn("font-semibold tabular-nums", tone as string)}
								>
									{naira((value as number) ?? 0)}
								</span>
							)}
						</div>
					))}
				</section>
			</div>

			<section className="snapshot-rise mt-10">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 className="text-xl font-semibold">Your payments</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{search.trim()
								? `${shown.length} of ${total} ${total === 1 ? "payment" : "payments"}`
								: `${total} ${total === 1 ? "payment" : "payments"}, newest first · click one for details`}
						</p>
					</div>
					{total > 0 ? (
						<div className="relative w-full sm:w-80">
							<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search amount, order, reference, bank…"
								className="pl-9"
								aria-label="Search your payments"
							/>
						</div>
					) : null}
				</div>

				<div className="mt-4 border-y">
					{query.isLoading ? (
						<div className="space-y-2 p-4">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					) : total === 0 ? (
						<p className="p-6 text-sm text-muted-foreground">
							No payments yet. When you pay into an order’s account and we
							confirm it, it shows here.
						</p>
					) : shown.length === 0 ? (
						<div className="flex items-center justify-between gap-4 p-6">
							<p className="text-sm text-muted-foreground">
								No payment matches “{search.trim()}”.
							</p>
							<Button variant="outline" onClick={() => setSearch("")}>
								Clear search
							</Button>
						</div>
					) : (
						shown.map((p, i) => (
							<button
								type="button"
								key={p.id}
								onClick={() => setOpen(p)}
								className={cn(
									"flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-accent/5",
									i > 0 && "border-t",
								)}
							>
								<ItemBadge kind="payment" moneyIn={p.amount >= 0} size="sm" />
								<div className="min-w-0 flex-1">
									<p className="font-semibold">{dayWords(p.date)}</p>
									<p className="truncate text-sm text-muted-foreground">
										{[p.orderNumber && `Order ${p.orderNumber}`, p.kind]
											.filter(Boolean)
											.join(" · ")}
									</p>
								</div>
								<span
									className={cn(
										"font-semibold tabular-nums",
										p.amount < 0 ? "" : MONEY.paid,
									)}
								>
									{signed(p.amount)}
								</span>
								<ChevronRight className="size-4 text-muted-foreground" />
							</button>
						))
					)}
				</div>

				<a
					href={SUPPORT_WHATSAPP_URL}
					target="_blank"
					rel="noreferrer"
					className="mt-4 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
				>
					A payment missing? Ask us →
				</a>
			</section>

			<Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
				<DialogContent className="gap-0 sm:max-w-md">
					{open ? (
						<>
							<DialogHeader className="border-b px-6 pt-6 pb-4">
								<DialogTitle
									className={cn(
										"text-2xl font-semibold tabular-nums",
										open.amount < 0 ? "" : MONEY.paid,
									)}
								>
									{signed(open.amount)}
								</DialogTitle>
								<DialogDescription>{open.kind}</DialogDescription>
							</DialogHeader>
							<dl className="space-y-3 px-6 py-5">
								{[
									["Date", dayWords(open.date)],
									[
										"Paid for",
										paidFor(open) +
											(open.movedWith
												? ` (${open.amount < 0 ? "to" : "from"} order ${open.movedWith})`
												: ""),
									],
									["Bank", open.paidInto?.bank],
									["Account number", open.paidInto?.accountNumber],
									["Account name", open.paidInto?.accountName],
									["Description", open.description],
									["From", open.from],
									["Reference", open.reference],
								]
									.filter(([, v]) => Boolean(v))
									.map(([k, v]) => (
										<div key={k as string}>
											<dt className="text-xs tracking-wide text-muted-foreground uppercase">
												{k}
											</dt>
											<dd className="mt-0.5 font-semibold break-words select-text">
												{v}
											</dd>
										</div>
									))}
							</dl>
						</>
					) : null}
				</DialogContent>
			</Dialog>
		</div>
	);
}
