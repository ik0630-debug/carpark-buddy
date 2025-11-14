-- Add UPDATE and DELETE policies for parking_applications
CREATE POLICY "Anyone can update applications"
ON public.parking_applications
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete applications"
ON public.parking_applications
FOR DELETE
USING (true);