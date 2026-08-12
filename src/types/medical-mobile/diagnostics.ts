export interface MedicalBoxDiagnosticsStatusItem {
	label: string;
	status: string;
	value?: string | number | null;
}

export interface MedicalBoxDiagnosticsSection {
	title: string;
	items: MedicalBoxDiagnosticsStatusItem[];
}

export interface MedicalBoxDiagnostics {
	box: MedicalBoxDiagnosticsSection;
	connections: MedicalBoxDiagnosticsSection;
	power: MedicalBoxDiagnosticsSection;
	storage: MedicalBoxDiagnosticsSection;
	camera: MedicalBoxDiagnosticsSection;
	light: MedicalBoxDiagnosticsSection;
}
