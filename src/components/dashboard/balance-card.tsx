import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MICRO, PANEL } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { customerApp, MONEY, netWords } from "@/lib/customer-app";
import { formatNaira } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

/**
 * Balance on the overview — replaced the wallet card (the owner, 13 Nov
 * 2026), as on the phone app's Home: where the customer stands on their
 * orders and trucks (one balance since 15 Nov 2026), Outstanding balance in
 * red or Overpayment in green.
 */
export default function BalanceCard() {
	const query = useQuery({
		queryKey: ["balance"],
		queryFn: () => customerApp.balance(),
		// Read again whenever they come back to the page, as the app does on focus.
		refetchOnWindowFocus: "always",
		refetchOnMount: "always",
	});
	const b = query.data;
	const words = b ? netWords(b.net) : null;

	return (
		<section className={cn(PANEL, "flex h-full flex-col")} aria-label="Balance">
			<div className="flex items-baseline justify-between border-b border-foreground/15 px-6 py-4">
				<span className={MICRO}>Balance</span>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="ghost"
						nativeButton={false}
						render={<Link to="/dashboard/wallet" />}
					>
						Payments
					</Button>
					<Button
						size="sm"
						variant="secondary"
						nativeButton={false}
						render={<Link to="/order" />}
					>
						New order
					</Button>
				</div>
			</div>

			<div className="px-6 pt-5 pb-6">
				{query.isLoading ? (
					<Skeleton className="h-16 w-48" />
				) : b && words ? (
					<Link
						to="/dashboard/wallet"
						className="ease-luxe block rounded-sm outline-hidden transition-opacity duration-250 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
					>
						<p className="text-sm font-semibold">{words.title}</p>
						<p
							className={cn(
								"mt-1.5 text-3xl leading-none font-semibold tracking-tight tabular-nums md:text-4xl",
								words.kind === "outstanding" && MONEY.owed,
								words.kind === "overpayment" && MONEY.paid,
							)}
						>
							{formatNaira(Math.abs(b.net))}
						</p>
						<p className="mt-2 text-sm text-muted-foreground">
							{words.caption}
						</p>
					</Link>
				) : (
					<p className="text-sm text-muted-foreground">
						Your balance could not be loaded.
					</p>
				)}
			</div>

			<dl className="mt-auto grid grid-cols-2 border-t border-foreground/15 bg-muted/40">
				<div className="border-r border-foreground/15 px-6 py-3.5">
					<dt className="text-xs font-medium text-muted-foreground">
						Total paid
					</dt>
					<dd className="mt-0.5 font-semibold tabular-nums">
						{b ? formatNaira(b.received + (b.trucks?.paid ?? 0)) : "—"}
					</dd>
				</div>
				<div className="px-6 py-3.5">
					<dt className="text-xs font-medium text-muted-foreground">
						{b?.trucks ? "Unpaid on orders and trucks" : "Unpaid on orders"}
					</dt>
					<dd
						className={cn(
							"mt-0.5 font-semibold tabular-nums",
							b &&
								b.outstanding + (b.trucks?.outstanding ?? 0) > 0.5 &&
								MONEY.owed,
						)}
					>
						{b
							? formatNaira(b.outstanding + (b.trucks?.outstanding ?? 0))
							: "—"}
					</dd>
				</div>
			</dl>
		</section>
	);
}
