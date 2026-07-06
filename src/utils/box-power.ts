export const BOX_POWERED_OFF_CONNECT_MESSAGE =
	"Box is powered off. Turn on the box to connect.";

export const isBoxPoweredOff = (power_status: string | null | undefined): boolean =>
	power_status === "off";
