import { createFileRoute, redirect } from "@tanstack/react-router";

import { authStore } from "@/lib/auth";

/**
 * The link every order email and notification carries: the backend builds
 * `${PORTAL_URL}/orders/:id` with the numeric order id, and those emails are
 * already sitting in customers' inboxes.
 *
 * Nobody should have to sign in just to see where their fuel is. A signed-in
 * customer goes to the full order page; everyone else lands on public
 * tracking, which needs no account and offers the sign-in for the invoice and
 * payment details. Both lookups accept a bare id as well as a reference
 * ("12294" resolves the same as "AE12294"), so this only has to forward.
 */
export const Route = createFileRoute("/orders/$orderId")({
	beforeLoad: async ({ params }) => {
		await authStore.ensureBootstrapped();
		if (authStore.getState().status === "authed") {
			throw redirect({
				to: "/dashboard/orders/$orderId",
				params,
				replace: true,
			});
		}
		throw redirect({
			to: "/t/$ref",
			params: { ref: params.orderId },
			replace: true,
		});
	},
});
