import { createFileRoute, redirect } from "@tanstack/react-router";

/** The Dangote request link the backend's emails carry — see orders.$orderId. */
export const Route = createFileRoute("/dangote-orders/$orderId")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/dashboard/dangote-delivery/$orderId",
			params,
			replace: true,
		});
	},
});
