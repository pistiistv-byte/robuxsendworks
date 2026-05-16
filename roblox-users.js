export default async function handler(req, res) {
  const username = String(req.query.username || "").trim();

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (username.length < 3) {
    return res.status(200).json({ users: [] });
  }

  const found = new Map();

  async function robloxFetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error("Roblox request failed " + response.status);
    }

    return response.json();
  }

  async function getAvatar(userId) {
    try {
      const data = await robloxFetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
      );
      const imageUrl = data?.data?.[0]?.imageUrl;
      if (imageUrl) return imageUrl;
    } catch (e) {}

    return "https://tr.rbxcdn.com/180DAY-AvatarHeadshot-Png/150/150/AvatarHeadshot/Png/noFilter";
  }

  async function addUser(user) {
    if (!user || !user.id || !user.name || found.has(user.id)) return;

    const avatar = await getAvatar(user.id);

    found.set(user.id, {
      id: user.id,
      name: user.name,
      displayName: user.displayName || user.name,
      avatar
    });
  }

  try {
    const exact = await robloxFetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
    });

    for (const user of exact.data || []) {
      await addUser(user);
    }
  } catch (e) {}

  try {
    const search = await robloxFetch(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`
    );

    for (const user of search.data || []) {
      await addUser(user);
    }
  } catch (e) {}

  return res.status(200).json({ users: Array.from(found.values()) });
}