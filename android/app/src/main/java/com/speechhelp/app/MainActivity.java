package com.speechhelp.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    WebView webView = this.getBridge().getWebView();

    CookieManager cookieManager = CookieManager.getInstance();
    cookieManager.setAcceptCookie(true);
    cookieManager.setAcceptThirdPartyCookies(webView, true);
    cookieManager.flush();

    String ua = webView.getSettings().getUserAgentString();
    if (ua != null && ua.contains("; wv")) {
      webView.getSettings().setUserAgentString(ua.replace("; wv", ""));
    }
  }
}
