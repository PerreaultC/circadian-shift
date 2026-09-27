#!/usr/bin/env python3
"""Wrap app-body.html into the standalone index.html for GitHub Pages."""
import pathlib
d = pathlib.Path(__file__).parent
src = (d/'app-body.html').read_text()
i = src.index('<div id="app">')
head, body = src[:i].rstrip(), src[i:].rstrip()
doc = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0A0D14">
  <meta name="description" content="A jet lag plan that shifts your body clock before and during a trip.">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Shift">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="icon-180.png">
  <style>
    :root{color-scheme:dark;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
    body{margin:0}
    img{max-width:100%}
    [hidden]{display:none!important}
  </style>
""" + head + """
</head>
<body>
""" + body + """
<script>
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
</script>
</body>
</html>
"""
(d/'index.html').write_text(doc)
print("index.html", len(doc), "bytes")
