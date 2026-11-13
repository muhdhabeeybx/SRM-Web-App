import { createFileRoute, Link } from "@tanstack/react-router";

import { LOADING_HOURS } from "@/lib/company";

export const Route = createFileRoute("/_site/faq")({
	component: FaqPage,
	head: () => ({
		meta: [
			{ title: "FAQ | Soroman Energy" },
			{
				name: "description",
				content:
					"Answers on ordering fuel, paying by bank transfer, your balance, buying a truck, tracking, and your Soroman account.",
			},
		],
	}),
});

/*
 * Answers are shown inline rather than behind an accordion. The audience reads
 * this on a phone over a slow connection, usually while deciding whether to
 * wire a large sum — hiding the answers behind taps adds friction to exactly
 * the content that earns trust, and costs a round of interaction to read.
 *
 * The same answers as the phone app's Help (13 Nov 2026): pay by the end of
 * the day you order, payments matched by the finance team, no wallet —
 * Balance instead, and buying a truck for delivery customers. Commission is
 * hidden for now, here as in the app.
 */
const SECTIONS = [
	{
		title: "Ordering",
		items: [
			{
				q: "What can I do with a Soroman account?",
				a: "Buy petroleum products from Soroman's depots at today's price, ask us to deliver from Dangote Refinery to your site, and — if you are one of our delivery customers — buy loaded trucks at the price you offer. You pay by bank transfer, and you follow every order and payment in your dashboard.",
			},
			{
				q: "Do I need an account?",
				a: "You can look at depot prices without one. To order, verify your phone number with a one-time code we text you — that creates your account.",
			},
			{
				q: "How do I place an order?",
				a: "Choose New order, then the depot and product, enter the litres, and choose pickup or delivery. Check the order and place it. The account to pay into shows straight away.",
			},
			{
				q: "How much can I order?",
				a: "Any amount, in litres. A truck carries about 60,000 litres, so we show how many trucks your order needs. For pickup you can add your own trucks and drivers, or leave that to the depot.",
			},
			{
				q: "What is the difference between pickup and delivery?",
				a: "Pickup: you load at the depot with your own truck. Delivery: a Soroman truck brings it to the address you give.",
			},
			{
				q: "Can I order when a depot shows as closed?",
				a: "No. A closed depot cannot load, so ordering is off until it reopens. The prices page shows every depot's status live.",
			},
			{
				q: "Can I cancel or repeat an order?",
				a: "You can cancel an order while it is unpaid: open it in Orders and choose Cancel order. To buy the same again, open a past order and choose Order again — it is priced at today's rate.",
			},
		],
	},
	{
		title: "Payment",
		items: [
			{
				q: "How do I pay?",
				a: "By bank transfer from any bank app, into the account shown on the order. Transfer the exact amount and write the order number as the description. You do not need to send a receipt.",
			},
			{
				q: "How long do I have to pay?",
				a: "Until 11:59 pm on the day you order — the order shows \u201cPay by\u201d with the time. Your price stays as it was when you ordered until then. An order with no payment by then is cancelled, and you can order again at that day's price. An order you have paid part of is not cancelled.",
			},
			{
				q: "When is my payment confirmed?",
				a: "Our finance team matches every transfer against our bank statement. Once it is matched, the order shows Payment Confirmed and we let you know.",
			},
			{
				q: "What if I pay less, or more, than the order?",
				a: "Less: pay the rest into the same account — the order waits for it and is not cancelled. More: the extra shows as an Overpayment in Balance; message us and we refund it or put it towards another order.",
			},
			{
				q: "Is there a wallet?",
				a: "No. Every order is paid into its own account; money is never taken from a balance. Balance shows what you have paid, and any Outstanding balance or Overpayment.",
			},
			{
				q: "What does Balance show?",
				a: "Where you stand on your orders: your Outstanding balance (what you still owe, in red) or your Overpayment (what you paid above your orders, in green). Below it is every payment we have matched — date, amount, the account it went into, what it paid for, and your transfer's description and reference. Search finds any of them by amount, order, reference or bank.",
			},
			{
				q: "A payment I made is not there.",
				a: "Payments show once our finance team has matched them. If yours is still missing a few hours later, message us with the date, amount and the reference from your bank.",
			},
		],
	},
	{
		title: "Loading and tracking",
		items: [
			{
				q: "How do I know where my order is?",
				a: "Open it in Orders. Every order moves through Order Received, Payment Confirmed, Processing, Released, Loading and Completed, and we let you know at each step. Anyone with the order number can also follow it on the tracking page.",
			},
			{
				q: "Where do I find my order number?",
				a: "On the order in Orders and in the text we send you. Write it as the description when you pay.",
			},
			{
				q: "What is Dangote Delivery?",
				a: "We buy from Dangote Refinery for you and deliver to your site. Tell us the product, the quantity and the address. Our team prices it and, once it is approved, shows you the account to pay into.",
			},
			{
				q: "Why do I need to upload a licence?",
				a: "A Dangote order can only be approved for a business with an approved licence (for example DPR / NUPRC). Upload it under Licenses in your dashboard; our team checks it.",
			},
		],
	},
	{
		title: "Buying a truck",
		items: [
			{
				q: "Who can buy a truck?",
				a: "Soroman's delivery customers. If you are one and there is no Buy a truck in your dashboard, call us and we link your account.",
			},
			{
				q: "How does buying a truck work?",
				a: "Open Buy a truck and choose a truck from the list. Enter the litres you want, the price per litre you offer, the customer's name and phone number, where it is going and when you will pay, and send. We approve it, or send you a new price to accept or decline in Orders. Once it is approved, the request shows the account to pay into and the amount, and we text you the driver.",
			},
		],
	},
	{
		title: "Your account",
		items: [
			{
				q: "How do I sign in?",
				a: "With a one-time code we text to your phone. On a browser you have signed in from before, you can use your PIN instead.",
			},
			{
				q: "I forgot my PIN or the code has not arrived.",
				a: "Sign in with a one-time code instead, then set a new PIN in Settings. Codes usually arrive within a minute; you can ask for another when the timer ends. If none comes, check the number or message us on WhatsApp.",
			},
			{
				q: "How do I change my phone number or delete my account?",
				a: "To change your number, contact us and we change it once we have checked it is you. To delete your account, use the Delete account page.",
			},
			// COMMISSIONS HIDDEN (13 Nov 2026) — back when commissions return.
			// {
			// 	q: "What is commission?",
			// 	a: "At locations that pay it, you earn commission on every litre you buy. It is paid by transfer to your commission bank account.",
			// },
			{
				q: "I work at Soroman.",
				a: "Staff sign in on the staff dashboard, not here — use the \u201cSoroman staff\u201d link on the sign-in page, with your staff email and password.",
			},
		],
	},
];

function FaqPage() {
	const sections = SECTIONS;

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28">
			<div className="flex items-center gap-4">
				<span className="h-px w-8 bg-foreground md:w-12" aria-hidden />
				<span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
					Frequently asked
				</span>
			</div>

			<h1 className="mt-8 max-w-2xl text-4xl leading-[0.95] tracking-tight text-balance md:text-5xl">
				Questions, answered plainly.
			</h1>
			<p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
				If something here does not cover it, the desk answers on WhatsApp during
				loading hours, {LOADING_HOURS}.
			</p>

			<div className="mt-16 grid gap-16">
				{sections.map(({ title, items }) => (
					<section key={title} className="grid gap-8 lg:grid-cols-12 lg:gap-16">
						<h2 className="text-2xl lg:col-span-3 md:text-3xl">{title}</h2>
						<dl className="lg:col-span-9">
							{items.map(({ q, a }) => (
								<div
									key={q}
									className="border-t border-border py-6 first:border-t-foreground"
								>
									<dt className="text-xl leading-snug">{q}</dt>
									<dd className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
										{a}
									</dd>
								</div>
							))}
						</dl>
					</section>
				))}
			</div>

			<div className="mt-20 border-t border-foreground pt-8">
				<p className="text-sm text-muted-foreground">
					Still stuck?{" "}
					<Link
						to="/contact"
						className="text-accent underline-offset-4 hover:underline"
					>
						Talk to the desk
					</Link>
					.
				</p>
			</div>
		</div>
	);
}
