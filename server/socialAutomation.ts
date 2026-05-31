import type { SocialPost } from "@shared/schema";

type PublishResult = {
  ok: boolean;
  externalPostId?: string;
  error?: string;
  provider?: string;
};

export function getSocialConnectionStatus() {
  const instagramReady = Boolean(
    process.env.META_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
  );
  const tiktokReady = Boolean(
    process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_ENABLE_DIRECT_POST === "true",
  );

  return {
    instagramReady,
    tiktokReady,
    approvalMode: process.env.SOCIAL_APPROVAL_MODE || "draft_first",
    schedulerEnabled: process.env.SOCIAL_AUTOMATION_ENABLED !== "false",
    requiredEnv: {
      instagram: ["META_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID"],
      tiktok: ["TIKTOK_ACCESS_TOKEN", "TIKTOK_ENABLE_DIRECT_POST=true"],
    },
  };
}

function buildCaption(post: SocialPost) {
  return [post.content, post.cta, post.hashtags].filter(Boolean).join("\n\n");
}

async function publishInstagram(post: SocialPost): Promise<PublishResult> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !accountId) {
    return { ok: false, provider: "instagram", error: "Instagram is not connected. Set META_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID." };
  }
  if (!post.mediaUrl || post.mediaType === "none") {
    return { ok: false, provider: "instagram", error: "Instagram publishing requires a public image or video mediaUrl." };
  }

  const apiVersion = process.env.META_GRAPH_VERSION || "v21.0";
  const mediaUrlParam = post.mediaType === "video" ? "video_url" : "image_url";
  const params = new URLSearchParams({
    [mediaUrlParam]: post.mediaUrl,
    caption: buildCaption(post),
    access_token: accessToken,
  });

  if (post.mediaType === "video") {
    params.set("media_type", "REELS");
  }

  const createResponse = await fetch(`https://graph.facebook.com/${apiVersion}/${accountId}/media`, {
    method: "POST",
    body: params,
  });
  const createData: any = await createResponse.json();
  if (!createResponse.ok || !createData.id) {
    return { ok: false, provider: "instagram", error: createData.error?.message || "Instagram media container creation failed." };
  }

  const publishResponse = await fetch(`https://graph.facebook.com/${apiVersion}/${accountId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: createData.id,
      access_token: accessToken,
    }),
  });
  const publishData: any = await publishResponse.json();
  if (!publishResponse.ok || !publishData.id) {
    return { ok: false, provider: "instagram", error: publishData.error?.message || "Instagram publish failed." };
  }

  return { ok: true, provider: "instagram", externalPostId: publishData.id };
}

async function publishTikTok(post: SocialPost): Promise<PublishResult> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  if (!accessToken || process.env.TIKTOK_ENABLE_DIRECT_POST !== "true") {
    return { ok: false, provider: "tiktok", error: "TikTok direct posting is not enabled. Set TIKTOK_ACCESS_TOKEN and TIKTOK_ENABLE_DIRECT_POST=true after TikTok app approval." };
  }
  if (!post.mediaUrl || post.mediaType !== "video") {
    return { ok: false, provider: "tiktok", error: "TikTok publishing requires a public video mediaUrl." };
  }

  const response = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: {
        source: "PULL_FROM_URL",
        video_url: post.mediaUrl,
      },
      post_info: {
        title: buildCaption(post).slice(0, 2200),
      },
    }),
  });
  const data: any = await response.json();
  if (!response.ok || data.error?.code) {
    return { ok: false, provider: "tiktok", error: data.error?.message || "TikTok publish initialization failed." };
  }

  return { ok: true, provider: "tiktok", externalPostId: data.data?.publish_id || data.data?.share_id || "tiktok-inbox-post" };
}

export async function publishSocialPost(post: SocialPost): Promise<PublishResult> {
  const channels = post.channels || [];
  const results: PublishResult[] = [];

  if (channels.includes("instagram")) {
    results.push(await publishInstagram(post));
  }
  if (channels.includes("tiktok")) {
    results.push(await publishTikTok(post));
  }

  if (results.length === 0) {
    return { ok: false, error: "No publishable channel selected." };
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length) {
    return {
      ok: false,
      error: failed.map((result) => `${result.provider}: ${result.error}`).join(" | "),
    };
  }

  return {
    ok: true,
    externalPostId: results.map((result) => `${result.provider}:${result.externalPostId}`).join(","),
  };
}

export function generateSocialPlan(createdBy: string) {
  const now = new Date();
  const nextSlot = (days: number, hour = 18) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  return [
    {
      title: "5-floor Batam club tour",
      campaignType: "customer",
      language: "en",
      channels: ["instagram", "tiktok"],
      content: "POV: one building gives you KTV, beauty, pet cafe, kids game house, and a sea-view live house in Batam.",
      hashtags: "#RebornWaveGroup #Batam #BatamNightlife #KTV #PetCafe #LiveHouse",
      mediaType: "video",
      cta: "Save this for your next Batam night out.",
      status: "draft",
      scheduledAt: nextSlot(1),
      createdBy,
    },
    {
      title: "Doluruu blindbox daily token hook",
      campaignType: "blindbox",
      language: "en",
      channels: ["instagram", "tiktok"],
      content: "Doluruu is not just a doll. Feed your digital pet daily, earn tokens, and exchange rewards in the Reborn Wave ecosystem.",
      hashtags: "#Doluruu #Blindbox #DigitalPet #RebornWaveGroup #Batam",
      mediaType: "video",
      cta: "Comment your Doluruu baby name idea.",
      status: "draft",
      scheduledAt: nextSlot(2),
      createdBy,
    },
    {
      title: "Investor package simple explainer",
      campaignType: "investor",
      language: "en",
      channels: ["instagram"],
      content: "Investor package: $5,000 club credits, capped $200K allocation, monthly pool logic, and 1 free Doluruu blindbox. ROI is a target, not guaranteed return.",
      hashtags: "#RebornWaveGroup #Investor #BatamBusiness #ClubEconomy",
      mediaType: "image",
      cta: "DM us to book a private investor walkthrough.",
      status: "draft",
      scheduledAt: nextSlot(3),
      createdBy,
    },
    {
      title: "Sea-view live house weekend invite",
      campaignType: "event",
      language: "en",
      channels: ["instagram", "tiktok"],
      content: "Live band, dance floor, rooftop sea view. This is the 5F energy at Reborn Wave Group Batam.",
      hashtags: "#BatamLiveMusic #LiveHouse #BatamEvents #RebornWaveGroup",
      mediaType: "video",
      cta: "Share this with your weekend group.",
      status: "draft",
      scheduledAt: nextSlot(4, 20),
      createdBy,
    },
    {
      title: "Recruit hosts, singers, stylists and promoters",
      campaignType: "recruitment",
      language: "en",
      channels: ["instagram", "tiktok"],
      content: "We are building a 5-floor entertainment team in Batam: hosts, singers, stylists, pet cafe crew, event staff, and promoters.",
      hashtags: "#BatamJobs #EntertainmentJobs #RebornWaveGroup #HiringBatam",
      mediaType: "image",
      cta: "Send your profile and the role you want.",
      status: "draft",
      scheduledAt: nextSlot(5, 13),
      createdBy,
    },
  ];
}
