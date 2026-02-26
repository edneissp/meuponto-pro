
-- Create storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Allow authenticated users to upload their own tenant logos
CREATE POLICY "Users can upload logos" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update logos" ON storage.objects FOR UPDATE
USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Logos are publicly accessible" ON storage.objects FOR SELECT
USING (bucket_id = 'logos');
