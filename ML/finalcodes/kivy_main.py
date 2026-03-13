from kivy.app import App
from kivy.lang import Builder
from kivy.uix.screenmanager import ScreenManager, Screen
from kivy.core.window import Window


class HomeScreen(Screen):
    """Landing screen with three main cards."""
    pass


class RootWidget(ScreenManager):
    """Screen manager – easy to extend with more screens later."""
    pass


class AphasiaKivyApp(App):
    """Kivy-based GUI entry point."""

    def build(self):
        # Optional: set a reasonable default size for desktop
        Window.size = (1280, 720)
        Builder.load_file("home.kv")
        return RootWidget()

    # The following callbacks are used from KV:
    def on_start_session(self):
        """Handle the 'Patient Starts Session' header button."""
        # TODO: hook this into your perception/analyzer pipeline
        print("Start session clicked")

    def on_card_pressed(self, card):
        """Handle taps on the Communicate / Practice / Settings cards."""
        card_id = getattr(card, "card_id", None)
        print(f"Card pressed: {card_id}")
        # TODO: switch screens or trigger actions based on card_id


if __name__ == "__main__":
    AphasiaKivyApp().run()

