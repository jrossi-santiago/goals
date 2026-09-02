import { createClient } from "@/lib/supabase/server";
import { VisionCanvas } from "@/components/vision/VisionCanvas";
import type { VisionItem } from "@/types/database";

export default async function VisionPage() {
  const supabase = await createClient();

  const [{ data: items }, { data: userData }] = await Promise.all([
    supabase.from("vision_items").select("*").order("z_index", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const withUrls = ((items as VisionItem[]) ?? []).map((item) => {
    if (item.type === "image" && item.image_path) {
      const { data } = supabase.storage.from("vision-images").getPublicUrl(item.image_path);
      return { ...item, imageUrl: data.publicUrl };
    }
    return { ...item, imageUrl: null };
  });

  return <VisionCanvas initialItems={withUrls} userId={userData.user?.id ?? ""} />;
}
