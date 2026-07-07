import { prisma } from "../db";

async function main() {
	const boxId = "01CAMPINGBOX123456789012345";
	console.log(`Updating telemetry for test box: ${boxId}`);

	const telemetry = await prisma.box_telemetry_latest.upsert({
		where: { box_id: boxId },
		create: {
			box_id: boxId,
			connection_status: "connected",
			battery_percentage: 85,
			battery_1_percentage: 88,
			battery_2_percentage: 82,
			charging_status: "on",
			health_status: "healthy",
			power_status: "on",
			wifi_status: "on",
			bluetooth_status: "on",
			gps_status: "on",
			sim_status: "on",
			solar_status: "on",
			port_big_status: "on",
			port_small_status: "on",
			save_to_memory_status: "on",
			light_status: "on",
			gyrosensor_status: "on",
			memory_percentage: 42,
			zone1_temp: 5,
			zone2_temp: 7,
			ext_temp: 22,
		},
		update: {
			connection_status: "connected",
			battery_percentage: 85,
			battery_1_percentage: 88,
			battery_2_percentage: 82,
			charging_status: "on",
			health_status: "healthy",
			power_status: "on",
			wifi_status: "on",
			bluetooth_status: "on",
			gps_status: "on",
			sim_status: "on",
			solar_status: "on",
			port_big_status: "on",
			port_small_status: "on",
			save_to_memory_status: "on",
			light_status: "on",
			gyrosensor_status: "on",
			memory_percentage: 42,
			zone1_temp: 5,
			zone2_temp: 7,
			ext_temp: 22,
		},
	});

	console.log("Telemetry updated successfully:", telemetry);
}

main()
	.catch(console.error)
	.finally(async () => {
		await prisma.$disconnect();
	});
