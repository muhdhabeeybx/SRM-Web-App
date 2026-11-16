import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Phone } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
	LOADING_HOURS,
	mapsHref,
	OFFICE_ADDRESS,
	SUPPORT_EMAIL,
	SUPPORT_PHONE,
	telHref,
	WHATSAPP_URL,
} from "@/lib/company";
import { customerApp, type SupportContact } from "@/lib/customer-app";
import { useCatalog } from "@/lib/use-catalog";

export const Route = createFileRoute("/_site/contact")({
	component: ContactPage,
	head: () => ({
		meta: [
			{ title: "Contact | Soroman Energy" },
			{
				name: "description",
				content:
					"Reach the Soroman desk by WhatsApp, phone, or email during loading hours for orders, payments, and depot questions.",
			},
		],
	}),
});

function ContactPage() {
	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
			<div className="flex items-center gap-4">
				<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
				<span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
					Contact
				</span>
			</div>

			<h1 className="mt-8 max-w-2xl text-4xl leading-[0.95] tracking-tight text-balance md:text-5xl">
				Talk to the desk.
			</h1>
			<p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
				Our desk answers during loading hours, {LOADING_HOURS}. WhatsApp is
				fastest — most questions are answered in minutes.
			</p>

			<div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-16">
				<div className="lg:col-span-7">
					<SupportLines />

					<div className="grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">
						<ContactMethod
							icon={MessageCircle}
							label="WhatsApp desk"
							value="Fastest — minutes during loading hours"
							action={
								<Button
									nativeButton={false}
									size="sm"
									render={
										<a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
											Open WhatsApp
										</a>
									}
								/>
							}
						/>
						<ContactMethod
							icon={Phone}
							label="Phone"
							value={SUPPORT_PHONE}
							action={
								<Button
									nativeButton={false}
									size="sm"
									variant="secondary"
									render={<a href={telHref(SUPPORT_PHONE)}>Call the desk</a>}
								/>
							}
						/>
					</div>

					<div className="mt-12 border-t border-foreground pt-8">
						<h2 className="text-2xl">Email</h2>
						<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
							For invoices, payments and account questions. Include your order
							reference so we can find it quickly.
						</p>
						<a
							href={`mailto:${SUPPORT_EMAIL}`}
							className="mt-4 inline-block text-sm text-accent underline-offset-4 hover:underline"
						>
							{SUPPORT_EMAIL}
						</a>
					</div>

					<div className="mt-12 border-t border-foreground pt-8">
						<h2 className="text-2xl">Visit us</h2>
						<address className="mt-2 text-sm leading-relaxed text-muted-foreground not-italic">
							{OFFICE_ADDRESS}
						</address>
						<a
							href={mapsHref(OFFICE_ADDRESS)}
							target="_blank"
							rel="noreferrer"
							className="mt-4 inline-block text-sm text-accent underline-offset-4 hover:underline"
						>
							Get directions
						</a>
					</div>
				</div>

				<aside className="lg:col-span-5">
					<div className="border-t border-foreground pt-8">
						<h2 className="text-2xl">Where we load</h2>
						<WhereWeLoad />
					</div>
				</aside>
			</div>
		</div>
	);
}

/**
 * Our lines by location and department — "Calabar Support", "Truck
 * Deliveries" — kept by Soroman staff on the dashboard, the same list the
 * phone app's Help shows (the owner, 15 Nov 2026). Nothing shows until staff
 * add one; the desk's own number and WhatsApp are below either way.
 */
function SupportLines() {
	const { data } = useQuery({
		queryKey: ["support-contacts"],
		queryFn: () => customerApp.supportContacts(),
		staleTime: 5 * 60_000,
	});
	const lines = data ?? [];
	if (!lines.length) return null;
	const chat = (c: SupportContact) =>
		`https://wa.me/${c.phone.replace(/\D/g, "").replace(/^0/, "234")}`;
	return (
		<section className="mb-12" aria-label="Our lines">
			<h2 className="text-2xl">Our lines</h2>
			<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
				Call the line for your location or what you need.
			</p>
			<ul className="mt-4 border-y">
				{lines.map((c, i) => (
					<li
						key={c.id}
						className={
							i > 0
								? "flex items-center gap-4 border-t py-3.5"
								: "flex items-center gap-4 py-3.5"
						}
					>
						<div className="min-w-0 flex-1">
							<p className="font-semibold">{c.name}</p>
							<p className="truncate text-sm text-muted-foreground">
								{c.phone}
								{c.note ? ` · ${c.note}` : ""}
							</p>
						</div>
						{c.whatsapp ? (
							<Button
								nativeButton={false}
								size="sm"
								variant="outline"
								render={
									<a href={chat(c)} target="_blank" rel="noreferrer">
										<MessageCircle />
										WhatsApp
									</a>
								}
							/>
						) : null}
						<Button
							nativeButton={false}
							size="sm"
							variant="secondary"
							render={
								<a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>
									<Phone />
									Call
								</a>
							}
						/>
					</li>
				))}
			</ul>
		</section>
	);
}

/** Editorial voice: small counts read as words, not digits. */
const NUMBER_WORDS = [
	"zero",
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
	"eight",
	"nine",
	"ten",
	"eleven",
	"twelve",
];
const spellOut = (n: number) => NUMBER_WORDS[n] ?? String(n);
const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The loading points, straight from GET /api/catalog — the same source the
 * price board reads.
 *
 * This list used to be a hardcoded DEPOT_LOCATIONS array, which meant a depot
 * added in the admin never appeared here and the names drifted from the ones
 * the backend actually serves. Anything the desk creates now shows up on its
 * own, and the count in the copy follows the list rather than asserting a
 * number of its own.
 */
function WhereWeLoad() {
	const { depots, isLoading } = useCatalog();

	// By state, then by name — the page reads as a geography rather than
	// whatever order the API happened to return.
	const locations = useMemo(
		() =>
			[...depots].sort(
				(a, b) =>
					a.state.localeCompare(b.state) || a.name.localeCompare(b.name),
			),
		[depots],
	);
	const stateCount = new Set(locations.map((d) => d.state)).size;

	const summary = isLoading
		? "Live prices and stock for each are on the depot prices page."
		: locations.length === 0
			? "Our loading points are listed on the depot prices page — or ask the desk and we will point you to the nearest one."
			: `${sentenceCase(spellOut(locations.length))} loading ${
					locations.length === 1 ? "point" : "points"
				} across ${spellOut(stateCount)} ${
					stateCount === 1 ? "state" : "states"
				}. Live prices and stock for each are on the depot prices page.`;

	return (
		<>
			<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
				{summary}
			</p>
			<ul className="mt-6">
				{isLoading
					? Array.from({ length: 6 }, (_, i) => (
							<li
								key={i}
								className="flex items-baseline justify-between border-b border-border py-3 last:border-b-0"
							>
								<Skeleton className="h-4 w-44" />
								<Skeleton className="h-4 w-24" />
							</li>
						))
					: locations.map(({ id, name, state }) => (
							<li
								key={id}
								className="flex items-baseline justify-between border-b border-border py-3 text-sm last:border-b-0"
							>
								<span className="font-medium">{name}</span>
								<span className="text-muted-foreground">{state} State</span>
							</li>
						))}
			</ul>
		</>
	);
}

function ContactMethod({
	icon: Icon,
	label,
	value,
	action,
}: {
	icon: typeof Phone;
	label: string;
	value: string;
	action: React.ReactNode;
}) {
	return (
		<div className="flex flex-col justify-between gap-6 bg-background p-8">
			<div>
				<Icon className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
				<h2 className="mt-4 text-xs tracking-[0.25em] uppercase">{label}</h2>
				<p className="mt-2 text-sm text-muted-foreground">{value}</p>
			</div>
			<div>{action}</div>
		</div>
	);
}
