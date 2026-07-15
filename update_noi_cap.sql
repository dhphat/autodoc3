-- SQL script to migrate existing noi_cap data to the new standard select options

-- Update any entries containing 'Cục Cảnh sát Quản lý hành chính' to the full string
UPDATE profiles
SET data = jsonb_set(
  data::jsonb,
  '{noi_cap}',
  '"Cục Cảnh sát Quản lý hành chính về Trật tự xã hội"'
)
WHERE data->>'noi_cap' ILIKE '%Cục Cảnh sát Quản lý%';

-- Update any entries containing 'Bộ Công an' to the full string
UPDATE profiles
SET data = jsonb_set(
  data::jsonb,
  '{noi_cap}',
  '"Bộ Công an"'
)
WHERE data->>'noi_cap' ILIKE '%Bộ Công an%';
