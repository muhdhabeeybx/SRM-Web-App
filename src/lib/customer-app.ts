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
	/** A number for an order payment; "t…" for a truck payment. */
	id: number | string;
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
	/**
	 * A delivery customer's trucks (the owner, 15 Nov 2026: one balance across
	 * orders and trucks), off Soroman's Sales Ledger. null when they buy none.
	 * `net` above already counts them.
	 */
	trucks?: {
		count: number;
		bought: number;
		paid: number;
		outstanding: number;
		surplus: number;
		/** Interest on trucks paid late, owed on top (19 Nov 2026); older servers leave it out. */
		interest?: number;
		creditLimit?: number | null;
		blocked?: boolean;
		payments: {
			id: string;
			date: string | null;
			amount: number;
			truckNumber: string;
			bank: string;
			reference: string;
		}[];
	} | null;
};

/** Truck payments in the shape of the payments list, newest first with the rest. */
function withTruckPayments(b: CustomerBalance): CustomerBalance {
	const extra: BalancePayment[] = (b.trucks?.payments ?? []).map((t) => ({
		id: t.id,
		date: t.date,
		amount: t.amount,
		kind: "Truck payment",
		orderNumber: null,
		orderStatus: null,
		product: t.truckNumber ? `Truck ${t.truckNumber}` : "Truck",
		quantity: null,
		unit: null,
		paidInto: t.bank
			? { bank: t.bank, accountName: "", accountNumber: "" }
			: null,
		description: "",
		from: "",
		reference: t.reference,
		movedWith: null,
	}));
	if (!extra.length) return b;
	const payments = [...b.payments, ...extra].sort((x, y) =>
		String(y.date ?? "").localeCompare(String(x.date ?? "")),
	);
	return { ...b, payments };
}

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
			caption: "What you still owe Soroman",
		};
	if (net > 0.5)
		return {
			kind: "overpayment",
			title: "Overpayment",
			caption: "Paid above what you owe — Soroman holds it for you",
		};
	return {
		kind: "settled",
		title: "Settled",
		caption: "Nothing owed to Soroman",
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

/**
 * A truck on sale. No PFI, and never where it loaded (the owner, 13 and 15
 * Nov 2026): that is how Soroman keeps its stock, staff's business.
 */
export type TruckOnSale = {
	loadingId: number;
	truckNumber: string;
	product: string;
	loadedOn: string;
	/** Where it is going. Blank = not yet set. */
	goingTo?: string;
	/** Its state and zone (17 Nov 2026): "Kano", "North West". A rep sees only their states' trucks. */
	state?: string;
	zone?: string;
	driverName?: string;
	/** "0803 ••• ••••" — the number itself is on their request once they ask. */
	driverPhoneMasked?: string;
	capacity: number;
	available: number;
	/** Loaded for this customer by name (19 Nov 2026): only they can ask for it. */
	reservedForYou?: boolean;
};

/**
 * Where a buyer stands on credit (the owner, 19 Nov 2026): a truck is paid
 * for within `daysToPay` days of the sale; after that `interestRate`% a year
 * is added on what is unpaid. Owing more than the limit, no new truck until
 * it is paid down. (Mobile: services/truckService.ts.)
 */
export type CreditPosition = {
	limit: number;
	owed: number;
	unpaid: number;
	interest: number;
	room: number;
	blocked: boolean;
	overdueTrucks: number;
	daysToPay: number;
	interestRate: number;
};

/** Why no new truck can be asked for, in full — or "" when they may ask. */
export function creditBlock(c: CreditPosition | null | undefined): string {
	if (!c?.blocked) return "";
	const toPay = Math.max(0, Math.ceil(c.owed - c.limit));
	const n = (v: number) => `₦${Math.round(v).toLocaleString("en-NG")}`;
	return `You owe ${n(c.owed)} on trucks${c.interest > 0.5 ? ` (with ${n(c.interest)} interest)` : ""}, above your credit limit of ${n(c.limit)}. Pay at least ${n(toPay)} to get a new truck.`;
}

/** A location trucks are going to, and what is on sale for it. */
export type TruckPlace = {
	/** The key it is grouped by; "" for trucks with no location set yet. */
	key: string;
	name: string;
	/** "Kano · North West": the state (when the town is not its name) and the zone. */
	area: string;
	trucks: TruckOnSale[];
};

/** "Kano · North West", or "Kaduna · North West" for a truck going to Zaria. */
export function areaOf(
	t: Pick<TruckOnSale, "goingTo" | "state" | "zone">,
): string {
	const town = String(t.goingTo || "")
		.trim()
		.toLowerCase();
	const state = String(t.state || "").trim();
	return [state && state.toLowerCase() !== town ? state : "", t.zone || ""]
		.filter(Boolean)
		.join(" · ");
}

/** Where a truck is going in full: "Zaria, Kaduna · North West". */
export function goingToText(
	t: Pick<TruckOnSale, "goingTo" | "state" | "zone">,
): string {
	const town = String(t.goingTo || "").trim();
	const area = areaOf(t);
	return (
		[town, area].filter(Boolean).join(town && area ? ", " : "") || "Not set yet"
	);
}

/** Trucks Soroman has not given a location yet. */
export const NO_PLACE = "Other trucks";

/**
 * The locations trucks are going to, A–Z, with their trucks — the first list
 * on Buy a truck. Grouped however the location was typed ("kano", "Kano "),
 * and the trucks with none come last. "Location" is the trade's word.
 */
export function placesOf(trucks: TruckOnSale[]): TruckPlace[] {
	const groups = new Map<string, TruckPlace>();
	for (const t of trucks) {
		const name = String(t.goingTo || "")
			.trim()
			.replace(/\s+/g, " ");
		const key = name.toLowerCase();
		const g = groups.get(key) ?? {
			key,
			name: name || NO_PLACE,
			area: areaOf(t),
			trucks: [],
		};
		g.trucks.push(t);
		groups.set(key, g);
	}
	return [...groups.values()].sort((a, b) =>
		!a.key ? 1 : !b.key ? -1 : a.name.localeCompare(b.name),
	);
}

export type TrucksOnSale = {
	linked: boolean;
	/** `states`: where they sell as a state sales rep — none, and they see no trucks. */
	buyer: { name: string; customerCode: string; states?: string[] } | null;
	trucks: TruckOnSale[];
	credit?: CreditPosition | null;
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
	/**
	 * Once approved: what it comes to and what is paid, off Soroman's Sales
	 * Ledger — Approved · unpaid, Part paid, Completed (the owner, 15 Nov
	 * 2026). Paid on delivery; no account on the request.
	 */
	payment?: {
		amount: number;
		paid: number;
		outstanding: number;
		state: "unpaid" | "part_paid" | "paid";
		orderNo: string;
		/** The truck's account, the one the approval text names; null with none yet. */
		account?: {
			bankName: string;
			accountNumber: string;
			accountName: string;
		} | null;
		/** Pay by this day; from the next, interest on what is unpaid, owed on top (19 Nov 2026). */
		dueOn?: string;
		interest?: number;
		/** Still to pay + interest: what clears it. */
		toPay?: number;
		overdue?: boolean;
	};
	/** While waiting: the approval it is at (19 Nov 2026) — 1 zonal coordinator, 2 CFO, 3 final. */
	stage?: "coordinator" | "cfo" | "admin" | null;
	stepsDone?: number;
};

/** Where a waiting request is in its three approvals, in words. */
export function approvalWords(
	r: Pick<TruckRequest, "stage" | "stepsDone">,
): string {
	if (!r.stage) return "Soroman is reviewing your request";
	if (r.stage === "coordinator")
		return "Approval 1 of 3 — with the zonal coordinator, then the CFO, then final approval";
	if (r.stage === "cfo")
		return "Approval 2 of 3 — zonal coordinator approved, now with the CFO";
	return "Approval 3 of 3 — zonal coordinator and CFO approved, waiting for final approval";
}

/**
 * The payment figures made whole: an older server sent only the amount, so
 * paid / still to pay / state are worked out rather than shown as nothing.
 */
export function withStanding(r: TruckRequest): TruckRequest {
	if (!r.payment) return r;
	const amount = Number(r.payment.amount) || 0;
	const paid = Number(r.payment.paid) || 0;
	const outstanding = Number.isFinite(Number(r.payment.outstanding))
		? Number(r.payment.outstanding)
		: Math.max(0, amount - paid);
	const state =
		r.payment.state ??
		(outstanding <= 0.5 && paid > 0
			? "paid"
			: paid > 0.5
				? "part_paid"
				: "unpaid");
	return { ...r, payment: { ...r.payment, amount, paid, outstanding, state } };
}

const TRUCKS = "/api/customer/trucks";

export const customerApp = {
	balance: async () =>
		withTruckPayments(
			await request<CustomerBalance>("/api/customer/wallet/balance"),
		),

	/** Help's numbers by location and department, kept by staff (open to guests). */
	supportContacts: async () =>
		(
			await request<{ contacts: SupportContact[] }>(
				"/api/customer/support-contacts",
			)
		).contacts ?? [],

	trucks: {
		onSale: () => request<TrucksOnSale>(TRUCKS),
		myRequests: async () =>
			(
				(await request<{ requests: TruckRequest[] }>(`${TRUCKS}/requests`))
					.requests ?? []
			).map(withStanding),
		ask: (body: {
			lines: { loadingId: number; quantity: number; rate: number }[];
			/** Where it is discharged — a station or address, typed as it is. */
			destination: string;
			/** Always on delivery (the owner, 15 Nov 2026). */
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
			withStanding(
				(
					await request<{ request: TruckRequest }>(
						`${TRUCKS}/requests/${id}/accept`,
						{ method: "POST", body: {}, csrf: true },
					)
				).request,
			),
		decline: async (id: number) =>
			withStanding(
				(
					await request<{ request: TruckRequest }>(
						`${TRUCKS}/requests/${id}/decline`,
						{ method: "POST", body: {}, csrf: true },
					)
				).request,
			),
		cancel: async (id: number) =>
			withStanding(
				(
					await request<{ request: TruckRequest }>(
						`${TRUCKS}/requests/${id}/cancel`,
						{ method: "POST", body: {}, csrf: true },
					)
				).request,
			),
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
	// Approved is a sale to pay for: owing until the payments match it.
	if (r.status === "approved" && r.payment) {
		if (r.payment.state === "paid") return { text: "Completed", tone: green };
		if (r.payment.state === "part_paid")
			return { text: "Part paid", tone: amber };
		return { text: "Approved · unpaid", tone: amber };
	}
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

/**
 * List rows are plain (the owner, 15 Nov 2026: replaced the 13 Nov stripes) —
 * a hairline between rows, no grey bands. Kept so callers need no change.
 */
export const zebra = (_i: number) => "";

// ── Help ─────────────────────────────────────────────────────────────────────

/** A support line by location or department — "Calabar Support", "Truck Deliveries". */
export type SupportContact = {
	id: number;
	name: string;
	phone: string;
	/** Chat on WhatsApp on the same number. */
	whatsapp: boolean;
	/** Under the name: hours, what the line is for. */
	note: string;
};

// ── Account ──────────────────────────────────────────────────────────────────

export type PhoneChangeStatus =
	| "pending"
	| "approved"
	| "declined"
	| "cancelled";

/** Asking Soroman to move the account to a new phone number; an admin decides. */
export type PhoneChange = {
	id: number;
	oldPhone: string;
	newPhone: string;
	note: string;
	status: PhoneChangeStatus;
	declineReason: string;
	createdAt: string | null;
	decidedAt: string | null;
};

type AvatarSignature = {
	timestamp: number;
	signature: string;
	apiKey: string;
	cloudName: string;
	folder: string;
};

/**
 * The Account page's own requests (the owner, 15 Nov 2026; Sman-Backend 0114),
 * as the phone app has them: a profile picture, and a new phone number.
 */
export const account = {
	/** The profile as the server has it now — the picture is only here. */
	profile: async () =>
		(
			await request<{
				customer: { phone: string; avatarUrl?: string | null };
			}>("/api/customer/profile")
		).customer,

	/** Upload straight to Cloudinary with a signature from Soroman, then save it. */
	async setAvatar(file: File): Promise<string> {
		const sig = await request<AvatarSignature>(
			"/api/customer/profile/avatar-signature",
		);
		const form = new FormData();
		form.append("file", file);
		form.append("api_key", sig.apiKey);
		form.append("timestamp", String(sig.timestamp));
		form.append("signature", sig.signature);
		form.append("folder", sig.folder);
		let res: Response;
		try {
			res = await fetch(
				`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
				{ method: "POST", body: form },
			);
		} catch {
			throw new Error(
				"Could not upload the picture. Check your connection and try again.",
			);
		}
		if (!res.ok)
			throw new Error("Could not upload the picture. Try another one.");
		const up = (await res.json()) as { secure_url: string; public_id: string };
		const saved = await request<{ avatarUrl: string }>(
			"/api/customer/profile/avatar",
			{
				method: "PUT",
				body: { url: up.secure_url, publicId: up.public_id },
				csrf: true,
			},
		);
		return saved.avatarUrl;
	},
	removeAvatar: async () => {
		await request("/api/customer/profile/avatar", {
			method: "DELETE",
			csrf: true,
		});
	},
	/** Their latest phone number request, or null. */
	phoneChange: async () =>
		(
			await request<{ request: PhoneChange | null }>(
				"/api/customer/profile/phone-change",
			)
		).request,
	askPhoneChange: async (newPhone: string, note = "") =>
		(
			await request<{ request: PhoneChange }>(
				"/api/customer/profile/phone-change",
				{ method: "POST", body: { newPhone, note }, csrf: true },
			)
		).request,
	cancelPhoneChange: async (id: number) =>
		(
			await request<{ request: PhoneChange | null }>(
				`/api/customer/profile/phone-change/${id}/cancel`,
				{ method: "POST", body: {}, csrf: true },
			)
		).request,
};

/** "+2348031112222" → "0803 111 2222": how people say their number. */
export function localPhone(phone: string | null | undefined): string {
	let d = String(phone || "").replace(/\D/g, "");
	if (d.startsWith("234")) d = `0${d.slice(3)}`;
	return d.length === 11
		? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
		: String(phone || "");
}

/** "1300000" → "1,300,000" as it is typed; a point and two decimals kept. */
export function withCommas(v: string): string {
	const clean = v.replace(/[^0-9.]/g, "");
	const [whole, ...rest] = clean.split(".");
	const w = whole
		.replace(/^0+(?=\d)/, "")
		.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return rest.length ? `${w}.${rest.join("").slice(0, 2)}` : w;
}
