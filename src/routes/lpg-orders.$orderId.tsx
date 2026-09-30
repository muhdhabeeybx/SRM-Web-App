import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The cooking gas request link the backend's emails carry — see
 * orders.$orderId. The detail route sends it on to /dashboard when cooking gas
 * is switched off.
 */
export const Route = createFileRoute("/lpg-orders/$orderId")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/dashboard/cooking-gas/$orderId",
			params,
			replace: true,
		});
	},
});
