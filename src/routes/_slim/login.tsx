import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import AuthShell from "@/components/auth/auth-shell";
import OtpLogin from "@/components/auth/otp-login";
import PinLogin from "@/components/auth/pin-login";
import PinSetup from "@/components/auth/pin-setup";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { authStore } from "@/lib/auth";

const searchSchema = z.object({
	// Only ever an internal path. Anything else (an absolute URL, a
	// protocol-relative "//evil.com") is dropped so a crafted ?redirect can't
	// bounce a freshly signed-in customer off-site.
	redirect: z
		.string()
		.optional()
		.transform((v) =>
			v?.startsWith("/") && !v.startsWith("//") ? v : undefined,
		),
});

export const Route = createFileRoute("/_slim/login")({
	validateSearch: searchSchema,
	beforeLoad: async ({ search }) => {
		await authStore.ensureBootstrapped();
		if (authStore.getState().status === "authed") {
			throw redirect({ to: search.redirect ?? "/dashboard" });
		}
	},
	component: LoginPage,
	head: () => ({
		meta: [
			{ title: "Sign in | Soroman Energy" },
			{
				name: "description",
				content:
					"Sign in to Soroman with a one-time phone code or your PIN to manage orders, payments, and tracking.",
			},
		],
	}),
});

/**
 * "order 12294" when the customer was sent here from an order link (an email's
 * View Order button, usually) — so the sign-in reads as the step in front of
 * their order rather than as a dead end. Null for everything else.
 */
function describeDestination(redirect: string | undefined): string | null {
	const match = redirect?.match(
		/^\/dashboard\/(orders|dangote-delivery|cooking-gas)\/([^/?#]+)/,
	);
	if (!match) return null;
	let id: string;
	try {
		id = decodeURIComponent(match[2]);
	} catch {
		return null;
	}
	return match[1] === "orders" ? `order ${id}` : `request ${id}`;
}

function LoginPage() {
	const navigate = useNavigate();
	const { redirect: redirectTo } = Route.useSearch();
	// A PIN is the only credential, and it needs a device this browser has
	// already proven by OTP. So a trusted device goes straight to the PIN box;
	// everyone else starts at the phone OTP, which is what mints the trust.
	const trusted = api.auth.hasTrustedDevice();
	const [method, setMethod] = useState<"phone" | "pin" | "setup-pin">(() =>
		trusted ? "pin" : "phone",
	);
	const done = () => void navigate({ to: redirectTo ?? "/dashboard" });

	// A code sign-in on an account with no PIN is usually a customer whose
	// account was opened from the admin dashboard and who has never heard of
	// the PIN. Offer it now — but only once this device is trusted, since a PIN
	// can't sign anyone in on a device that isn't.
	const afterCode = async () => {
		if (api.auth.hasTrustedDevice()) {
			try {
				const { hasPin } = await api.me.identities();
				if (!hasPin) {
					setMethod("setup-pin");
					return;
				}
			} catch {
				// Not knowing is no reason to hold them at the door.
			}
		}
		done();
	};

	if (method === "setup-pin") {
		return (
			<AuthShell>
				<PinSetup onDone={done} />
			</AuthShell>
		);
	}

	const pending = describeDestination(redirectTo);

	return (
		<AuthShell>
			{pending && (
				<p className="mb-6 flex items-center gap-2.5 rounded-lg border border-foreground/10 bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
					<LockKeyhole className="size-4 shrink-0" aria-hidden />
					<span>
						Sign in to view{" "}
						<span className="font-medium text-foreground">{pending}</span>.
					</span>
				</p>
			)}
			{method === "pin" ? (
				<PinLogin onSuccess={done} onUseCode={() => setMethod("phone")} />
			) : (
				<OtpLogin
					onSuccess={() => void afterCode()}
					// Only worth offering the way back if a PIN can actually work here.
					onSwitchMethod={trusted ? () => setMethod("pin") : undefined}
				/>
			)}
			<div className="mt-6 flex items-center justify-center gap-2 border-t border-foreground/10 pt-5">
				<span className="text-xs text-muted-foreground">New to Soroman?</span>
				<Button
					size="sm"
					variant="outline"
					nativeButton={false}
					render={<Link to="/register">Create an account</Link>}
				/>
			</div>
		</AuthShell>
	);
}
