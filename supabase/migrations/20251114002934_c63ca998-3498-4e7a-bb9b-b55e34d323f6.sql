-- Create enum for application status
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

-- Create parking_types table
CREATE TABLE public.parking_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hours INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create parking_applications table
CREATE TABLE public.parking_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_number TEXT NOT NULL,
  last_four TEXT NOT NULL,
  status application_status DEFAULT 'pending',
  parking_type_id UUID REFERENCES public.parking_types(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  applicant_name TEXT,
  applicant_phone TEXT
);

-- Enable RLS
ALTER TABLE public.parking_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parking_types (everyone can read)
CREATE POLICY "Anyone can view parking types"
  ON public.parking_types
  FOR SELECT
  USING (true);

-- RLS Policies for parking_applications (everyone can insert)
CREATE POLICY "Anyone can submit applications"
  ON public.parking_applications
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for parking_applications (everyone can read their own by last_four)
CREATE POLICY "Anyone can view applications by last four digits"
  ON public.parking_applications
  FOR SELECT
  USING (true);

-- Insert default parking types
INSERT INTO public.parking_types (name, hours) VALUES
  ('3시간권', 3),
  ('4시간권', 4),
  ('6시간권', 6),
  ('종일권', 24);

-- Create index for faster lookups
CREATE INDEX idx_parking_applications_last_four ON public.parking_applications(last_four);
CREATE INDEX idx_parking_applications_status ON public.parking_applications(status);