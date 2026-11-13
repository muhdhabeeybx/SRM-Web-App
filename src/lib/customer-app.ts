import { request } from "@/lib/http";

/**
 * The customer features the Soroman phone app gained in November 2026, on the
 * web too (the owner, 13 Nov 2026): the Balance that replaced the wallet, and
 * Buy a truck for delivery customers, with requests in Orders. Same server
 * endpoints and the same words as the app (soroman-mobile-app
 * services/balanceService.ts, services/truckService.ts).
 */

// ── Balance ──────────────────────────────────────────────────────────────────

/** A payment as the bank statement shows it, with the order it paid for. */
export type BalancePayment = {
	id: number;
	date: string | null;
	amount: number;
	/** "Bank transfer", "Moved to another order", "Refunded to you", … */
	kind: string;
	orderNumber: string | null;
	orderStatus: string | null;
	product: string | null;
	quantity: number | null;
	unit: string | null;
	paidInto: { bank: string; accountName: string; accountNumber: string } | null;
	description: string;
	from: string;
	reference: string;
	movedWith: string | null;
};

export type CustomerBalance = {
	/** surplus − outstanding: above 0 Soroman holds their money, below 0 they owe. */
	net: number;
	outstanding: number;
	surplus: number;
	ordered: number;
	received: number;
	orders: number;
	lastBankPayment: string | null;
	payments: BalancePayment[];
};

export type NetKind = "outstanding" | "overpayment" | "settled";

/** Soroman's own words for the net — the same in the app. */
export function netWords(net: number): {
	kind: NetKind;
	title: string;
	caption: string;
} {
	if (net < -0.5)
		return {
			kind: "outstanding",
			title: "Outstanding balance",
			caption: "What you still owe on your orders",
		};
	if (net > 0.5)
		return {
			kind: "overpayment",
			title: "Overpayment",
			caption: "Paid above your orders — Soroman holds it for you",
		};
	return {
		kind: "settled",
		title: "Settled",
		caption: "Nothing owed on your orders",
	};
}

/** Money colours: owed red, paid / in credit green, dead struck through grey. */
export const MONEY = {
	owed: "text-red-600 dark:text-red-400",
	paid: "text-emerald-700 dark:text-emerald-400",
	plain: "",
	void: "text-muted-foreground line-through",
} as const;
export type MoneyState = keyof typeof MONEY;

// ── Trucks ───────────────────────────────────────────────────────────────────

/** A truck on sale. No PFI: that is how Soroman keeps its stock, staff's business. */
export type TruckOnSale = {
	loadingId: number;
	truckNumber: string;
	product: string;
	/** The depot or refinery it loaded at — where the litres are. */
	loadedAt: string;
	loadedOn: string;
	capacity: number;
	available: number;
};

export type TrucksOnSale = {
	linked: boolean;
	buyer: { name: string; customerCode: string } | null;
	trucks: TruckOnSale[];
};

export type TruckRequestStatus =
	| "pending"
	| "countered"
	| "approved"
	| "rejected"
	| "declined"
	| "cancelled";
export type PaymentTerms = "on_delivery" | "before_delivery";

export type TruckRequest = {
	id: number;
	requestRef: string;
	loadingId: number;
	customerName: string;
	customerPhone: string;
	truckNumber: string;
	product: string;
	depot: string;
	quantity: number;
	rate: number;
	amount: number;
	counterRate: number | null;
	counterAmount: number | null;
	counterNote: string;
	destination: string;
	paymentTerms: PaymentTerms;
	paymentTermsLabel: string;
	notes: string;
	status: TruckRequestStatus;
	statusLabel: string;
	createdAt: string;
	decidedAt: string | null;
	driverName: string;
	driverPhone: string;
	/** Once approved: what to pay, into which account, with which reference. */
	payment?: {
		amount: number;
		orderNo: string;
		account: {
			bankName: string;
			accountNumber: string;
			accountName: string;
		} | null;
	};
};

const TRUCKS = "/api/customer/trucks";

export const customerApp = {
	balance: () => request<CustomerBalance>("/api/customer/wallet/balance"),

	trucks: {
		onSale: () => request<TrucksOnSale>(TRUCKS),
		myRequests: async () =>
			(await request<{ requests: TruckRequest[] }>(`${TRUCKS}/requests`))
				.requests ?? [],
		ask: (body: {
			lines: { loadingId: number; quantity: number; rate: number }[];
			destination: string;
			paymentTerms: PaymentTerms;
			notes?: string;
			customerName?: string;
			customerPhone?: string;
		}) =>
			request<{ requestRef: string; requests: TruckRequest[] }>(
				`${TRUCKS}/requests`,
				{ method: "POST", body, csrf: true },
			),
		accept: async (id: number) =>
			(
				await request<{ request: TruckRequest }>(
					`${TRUCKS}/requests/${id}/accept`,
					{ method: "POST", body: {}, csrf: true },
				)
			).request,
		decline: async (id: number) =>
			(
				await request<{ request: TruckRequest }>(
					`${TRUCKS}/requests/${id}/decline`,
					{ method: "POST", body: {}, csrf: true },
				)
			).request,
		cancel: async (id: number) =>
			(
				await request<{ request: TruckRequest }>(
					`${TRUCKS}/requests/${id}/cancel`,
					{ method: "POST", body: {}, csrf: true },
				)
			).request,
	},
};

/** "PMS" → "Petrol (PMS)": the name a buyer knows, with the code they also use. */
export function productName(code: string): string {
	const c = String(code || "")
		.trim()
		.toUpperCase();
	const known: Record<string, string> = {
		PMS: "Petrol (PMS)",
		AGO: "Diesel (AGO)",
		DPK: "Kerosene (DPK)",
		LPG: "Cooking gas (LPG)",
		ATK: "Aviation fuel (ATK)",
	};
	return known[c] || code || "Fuel";
}

/** A request's status in plain words, and its badge colours. */
export function requestStatus(r: TruckRequest): { text: string; tone: string } {
	const amber =
		"border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
	const green =
		"border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400";
	const red = "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-400";
	const map: Record<TruckRequestStatus, [string, string]> = {
		pending: ["Pending approval", amber],
		countered: ["Price offered", amber],
		approved: ["Approved", green],
		rejected: ["Rejected", red],
		declined: ["Declined", red],
		cancelled: ["Cancelled", red],
	};
	const [text, tone] = map[r.status] ?? [r.statusLabel, amber];
	return { text, tone };
}

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];
const two = (n: number) => String(n).padStart(2, "0");

/** "12 Nov 2026" — and nothing for a time it cannot read. */
export function dayWords(iso: string | null | undefined): string {
	if (!iso) return "";
	const d = new Date(iso);
	return Number.isNaN(d.getTime())
		? ""
		: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12 Nov 2026, 09:09". */
export function whenWords(iso: string | null | undefined): string {
	if (!iso) return "";
	const d = new Date(iso);
	return Number.isNaN(d.getTime())
		? ""
		: `${dayWords(iso)}, ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** "11:59 pm today" / "11:59 pm tomorrow" / "11:59 pm, 14 Nov". */
export function deadlineWords(iso: string | null | undefined): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	const h = d.getHours();
	const time = `${h % 12 || 12}:${two(d.getMinutes())} ${h < 12 ? "am" : "pm"}`;
	const key = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
	const now = new Date();
	const tomorrow = new Date(now);
	tomorrow.setDate(now.getDate() + 1);
	if (key(d) === key(now)) return `${time} today`;
	if (key(d) === key(tomorrow)) return `${time} tomorrow`;
	return `${time}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Litres with a no-break space, so "10,000 L" never splits. */
export const litres = (n: number) =>
	`${Math.round(n || 0).toLocaleString("en-NG")} L`;

/** Alternating list rows: white and light grey; two dark shades in dark mode. */
export const zebra = (i: number) =>
	i % 2 === 0 ? "bg-background" : "bg-zinc-100/80 dark:bg-zinc-900/60";
