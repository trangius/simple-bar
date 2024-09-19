import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons/icons.jsx";
import useWidgetRefresh from "../../hooks/use-widget-refresh";
import useServerSocket from "../../hooks/use-server-socket";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils";

export { keyboardStyles as styles } from "../../styles/components/data/keyboard";

const { React } = Uebersicht;

const DEFAULT_REFRESH_FREQUENCY = 20000;

export const Widget = React.memo(() => {
  const { displayIndex, settings } = useSimpleBarContext();
  const { widgets, keyboardWidgetOptions } = settings;
  const { keyboardWidget } = widgets;
  const { refreshFrequency, showOnDisplay } = keyboardWidgetOptions;

  const refresh = React.useMemo(
    () =>
      Utils.getRefreshFrequency(refreshFrequency, DEFAULT_REFRESH_FREQUENCY),
    [refreshFrequency]
  );

  const visible =
    Utils.isVisibleOnDisplay(displayIndex, showOnDisplay) && keyboardWidget;

  const [state, setState] = React.useState();
  const [loading, setLoading] = React.useState(visible);

  const resetWidget = () => {
    setState(undefined);
    setLoading(false);
  };

  const getKeyboard = React.useCallback(async () => {
    if (!visible) return;
    const keyboard = await Uebersicht.run(
      `defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleSelectedInputSources | awk '/KeyboardLayout Name/ {print $4}'`
    );
    var layout = Utils.cleanupOutput(keyboard).replace(";", "");
	if(layout.includes("Swedish"))
		layout="SE";
	else
		layout="US";
    if (layout.length) {
      setState({ keyboard: layout });
      setLoading(false);
      return;
    }

    const inputMode = await Uebersicht.run(
      `defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleSelectedInputSources | awk '/"Input Mode" =/ {print $4}'`
    );
    const cleanedInputMode = Utils.cleanupOutput(inputMode)
      .replace(/"com.apple.inputmethod.(.*)"/, "$1")
      .replace(";", "");

    if (!cleanedInputMode.length) return setLoading(false);

    const splitedInputMode = cleanedInputMode.split(".");
    const inputModeName = splitedInputMode[splitedInputMode.length - 1];
    setState({ keyboard: inputModeName });
    setLoading(false);
  }, [visible]);

  useServerSocket("keyboard", visible, getKeyboard, resetWidget);
  useWidgetRefresh(visible, getKeyboard, refresh);

  if (loading) return <DataWidgetLoader.Widget className="keyboard" />;
  if (!state) return null;
  const { keyboard } = state;

  if (!keyboard?.length) return null;

  return (
    <DataWidget.Widget classes="keyboard" Icon={Icons.Keyboard}>
      {keyboard}
    </DataWidget.Widget>
  );
});

Widget.displayName = "Keyboard";
