export interface CampingCameraLiveData {
	stream_url: string;
	expires_at: string;
	mode: "live" | "surveillance";
	cam_id: number;
	box_display_id?: string;
}

export interface CampingCameraFeed {
	feed_id: string;
	title: string;
	recorded_at: string;
	duration_seconds: number;
	thumbnail_url: string | null;
	cam_id: number;
}

export interface CampingCameraFeedsData {
	feeds: CampingCameraFeed[];
}

export interface CampingCameraStreamData {
	stream_url: string;
	download_url: string | null;
	expires_at: string;
	feed_id: string;
	cam_id: number;
}

export interface CampingSurveillanceModeData {
	surveillance_enabled: boolean;
}

export interface CampingCameraUploadUrlData {
	upload_url: string;
	s3_key: string;
	expires_at: string;
	feed_id: string | null;
	cam_id: number;
	kind: "live" | "recording" | "thumbnail";
}

export interface CampingCameraFeedRegisterData {
	feed_id: string;
	cam_id: number;
	s3_key: string;
	thumbnail_key: string | null;
	recorded_at: string;
	duration_sec: number | null;
}
