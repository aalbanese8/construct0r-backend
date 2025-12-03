# Raspberry Pi Setup - Dead Simple

## What You Need
- Raspberry Pi (3, 4, or 5 - recommended: Pi 4 with 4GB+ RAM)
- MicroSD card (16GB minimum, 32GB recommended)
- Power supply
- Internet connection (Ethernet or WiFi)

## Step 1: Flash SD Card (5 minutes)
1. Download **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Insert SD card into your computer
3. Open Raspberry Pi Imager
4. Choose:
   - **OS**: Raspberry Pi OS (64-bit) - recommended
   - **Storage**: Your SD card
5. Click the **gear icon** ⚙️ to configure:
   - Set hostname: `construct0r`
   - Enable SSH
   - Set username/password
   - Configure WiFi (if using WiFi)
6. Click **Write** and wait

## Step 2: Boot Pi (2 minutes)
1. Insert SD card into Raspberry Pi
2. Connect power, keyboard, mouse, monitor (or just power if using SSH)
3. Wait for boot (~1 minute)
4. Find your Pi's IP address:
   - On Pi desktop: hover over network icon
   - From another computer: `ping construct0r.local`
   - On your router: look for "construct0r" in connected devices

## Step 3: One-Command Setup (10 minutes)
SSH into your Pi or open a terminal on the Pi, then run:

```bash
curl -fsSL https://raw.githubusercontent.com/aalbanese8/construct0r-backend/main/setup-pi.sh | bash
```

This will automatically:
- ✅ Install Node.js, Python, and dependencies
- ✅ Clone the repository
- ✅ Build the project
- ✅ Set up auto-start on boot
- ✅ Create the backend service

## Step 4: Configure (2 minutes)
Edit the `.env` file with your actual credentials:

```bash
cd ~/construct0r-backend
nano .env
```

Update these values:
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `JWT_SECRET` - A random secret string
- `FRONTEND_URL` - Your frontend URL (e.g., `http://192.168.1.100:3000`)

Save with `Ctrl+X`, then `Y`, then `Enter`

## Step 5: Start the Backend (1 minute)

```bash
sudo systemctl start construct0r-backend
sudo systemctl status construct0r-backend
```

You should see `Active: active (running)` in green!

## Step 6: Update Frontend URL
Update your frontend to point to the Pi's IP address:
```
http://192.168.1.XXX:3001
```
(Replace XXX with your Pi's IP address)

## Done! 🎉

Your backend is now running on your Pi!

## Useful Commands

**View logs:**
```bash
sudo journalctl -u construct0r-backend -f
```

**Restart service:**
```bash
sudo systemctl restart construct0r-backend
```

**Stop service:**
```bash
sudo systemctl stop construct0r-backend
```

**Update code:**
```bash
cd ~/construct0r-backend
git pull
npm run build
sudo systemctl restart construct0r-backend
```

## Port Forwarding (Optional - for access outside home)

If you want to access your backend from outside your home network:

1. Go to your router settings (usually `192.168.1.1` or `192.168.0.1`)
2. Find "Port Forwarding" section
3. Add rule:
   - **External Port**: 3001
   - **Internal IP**: Your Pi's IP (e.g., 192.168.1.100)
   - **Internal Port**: 3001
   - **Protocol**: TCP
4. Save and reboot router if needed
5. Find your public IP: https://whatismyipaddress.com
6. Access via: `http://YOUR_PUBLIC_IP:3001`

**Note**: This exposes your backend to the internet. Consider adding authentication or using a VPN instead.

## Troubleshooting

**Service won't start:**
```bash
sudo journalctl -u construct0r-backend -n 50
```
Check the logs for errors.

**Can't connect from frontend:**
- Make sure Pi and frontend are on same network
- Check firewall isn't blocking port 3001
- Verify `.env` has correct `FRONTEND_URL`

**Need to reinstall:**
```bash
rm -rf ~/construct0r-backend
curl -fsSL https://raw.githubusercontent.com/aalbanese8/construct0r-backend/main/setup-pi.sh | bash
```
