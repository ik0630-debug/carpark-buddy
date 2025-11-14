-- Add INSERT, UPDATE, DELETE policies for parking_types
CREATE POLICY "Anyone can insert parking types"
ON public.parking_types
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update parking types"
ON public.parking_types
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete parking types"
ON public.parking_types
FOR DELETE
USING (true);