-- Enable realtime for parking_applications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_applications;

-- Set replica identity to full for complete row data during updates
ALTER TABLE public.parking_applications REPLICA IDENTITY FULL;