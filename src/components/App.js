import "./App.css";
import ToggleButton from "react-toggle-button";
import { Component } from "react";
import {
  ScatterChart,
  ResponsiveContainer,
  CartesianGrid,
  Scatter,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
} from "recharts";
import { convertUnixTimeToHHMMSS } from "../utils/helpers";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      alarmOn: false,
      currentTemperature: "0",
      currentHumidity: "0",
      syncTime: "00:00:00",
      historyData: {},
      minimumTemp: 0,
      maximumTemp: 0,
      refreshRate: 1,
    };

    this.handleRefreshClick = this.handleRefreshClick.bind(this);
    this.handleRefreshClick();
    this.handleSubmit = this.handleSubmit.bind(this);
  }


  handleMinValueChange = (event) => {
    this.setState({ minimumTemp: event.target.value });
  }

  handleMaxValueChange = (event) => {
    this.setState({ maximumTemp: event.target.value });
  }

  handleSubmit(event) {
    event.preventDefault();
    // Perform some action with form data

    if (parseInt(this.state.minimumTemp) >= parseInt(this.state.maximumTemp)) {
      alert('Minimum value must be less than maximum value.');
    } 
    
    else {
      console.log('Form submitted with data:', this.state);
      const url = '/update_bounds';
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lower_temp_bound: this.state.minimumTemp,
          upper_temp_bound: this.state.maximumTemp,
          refresh_rate: this.state.refreshRate,
        }),
      };

      fetch(url, options)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          alert("Sensor maximum temperature, minimum temperature and refreshrate values updated")
        })
        .catch(error => {
          console.error('There was a problem with the network request:', error);
          // Handle error case
        });
    }
  }

  // Taking care of alarm management
  setalarmState(state) {
    this.setState({ alarmOn: state !== "0" });
  }

  componentDidMount() {
    fetch("/alarm")
      .then((response) => response.text())
      .then((state) => this.setalarmState(state));
  }

  handleStateChange(alarmOn) {
    fetch("/alarm", { method: "PUT", body: alarmOn ? "1" : "0" })
      .then((response) => response.text())
      .then((state) => this.setalarmState(state));
  }
  
  handleRefreshClick() {
    
    fetch("/allData")
    .then((response) => response.text())
    .then((data) => {
      if (data) {
        console.log("Fetching data..");
        console.log(data);
        var json = JSON.parse(data);

        this.setState({ currentTemperature: json.temperature });
        this.setState({ currentHumidity: json.humidity });
        this.setState({ syncTime: convertUnixTimeToHHMMSS(json.time*1000) });
        this.setState({ minimumTemp: json.lower_temp_bound});
        this.setState({ maximumTemp: json.upper_temp_bound});
        this.setState({ refreshRate: json.refresh_rate});

        const arrData = [];
        console.log("History data:", arrData);

        for (const prop in json.history) {
          json.history[prop].time = json.history[prop].time*1000; 
          arrData.push(json.history[prop]);
        }
        var newArray = Object.keys(arrData).filter(key => arrData[key].time !== 0).map(key => arrData[key]);
        console.log(newArray);
        this.setState({ historyData: newArray });
      }
    });
}


  /**
   * Renders a XY chart
   * @param {Array<object>} data
   * @param {String} legend name of the X,Y value set e.g. Temperature (°C)
   * @param {String} yAxisName Free form name for the y-axis
   * @param {String} yAxisData property name of the y-axis data in "data" array's objects
   * @param {String} xAxisName Free form name for the x-axis
   * @param {String} xAxisData property name of the x-axis data in "data" array's objects
   * @param {Array<String>} xDomain scaling of x-axis, optional
   * @param {Array<String>} yDomain scaling of y-axis, optional
   * @param {Function} xTickFormatter formatter function for x-axis values
   * @param {Function} yTickFormatter formatter function for y-axis values
   * @param {Function} tooltipFormatter formatter function for tooltip value
   * @returns React ScatterChart component with line connecting XY values
   */
  renderXYChart(
    data,
    legend,
    yAxisName,
    yAxisData,
    xAxisName,
    xAxisData,
    xDomain = ["auto", "auto"],
    yDomain = ["auto", "auto"],
    xTickFormatter,
    yTickFormatter,
    tooltipFormatter
  ) {
    return (
      <ResponsiveContainer width="95%" height={300}>
        <ScatterChart>
          <CartesianGrid />
          <Tooltip formatter={tooltipFormatter} />
          <Legend verticalAlign="top" height={36} />
          <XAxis
            dataKey={xAxisData}
            name={xAxisName}
            type="number"
            domain={xDomain}
            tickFormatter={xTickFormatter}
          />
          <YAxis
            dataKey={yAxisData}
            name={yAxisName}
            type="number"
            domain={yDomain}
            tickFormatter={yTickFormatter}
          />
          <Scatter
            data={data}
            line={{ stroke: "#eee" }}
            lineJointType="monotoneX"
            lineType="joint"
            fill="#30a5ff"
            name={legend}
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // Draws UI
  render() {
    return (
      <div className="App">
        <div className="controls">
          <h1>Controls</h1>
          <button className="refbut" type="button" onClick={this.handleRefreshClick}>
            Refresh Values{" "}
          </button>
          <div className="alarmbut">
            <h3>Alarm status:</h3>
          </div>
          <ToggleButton
              value={this.state.alarmOn}
              onToggle={(value) => this.handleStateChange(value)}
            />
          <div className="refbounds">
          <h3>Temperature alarm bounds</h3>
            <form onSubmit={this.handleSubmit}>
              <div>
                <label>
                  Minimum temperature:
                  <input className="upinput"
                    name="upperTemp" type="number"
                    value={this.state.minimumTemp}
                    onChange={this.handleMinValueChange} />
                </label>
              </div>
              <div>
                <label className="inputlabel">

                  Maximum temperature:
                  <input className="midinput"
                    name="upperTemp" type="number"
                    value={this.state.maximumTemp}
                    onChange={this.handleMaxValueChange} />
                </label>
              </div>
              <div>
                <label>

                  Refresh Rate (minutes):
                  <input className="lowinput"
                    name="refreshRate"
                    type="number"
                    value={this.state.refreshRate}
                    onChange={(e) => {
                      const value = e.target.value;
                      const newValue = value < 1 ? 1 : value;
                      this.setState({ refreshRate: newValue });
                    }}
                  />
                </label>
              </div>
              <button className="subbut" type="submit">Submit changes</button>
            </form>
          </div>
        </div>
        



        <div className="info">
          <div className="current">
            <h1>Latest data</h1>
            <p>Last sync: {this.state.syncTime}</p>
            <p>Temperature: {this.state.currentTemperature} °C</p>
            <p>Humidity: {this.state.currentHumidity} %</p>
            {this.state.currentTemperature < this.state.minimumTemp && <p style={{ color: 'red' }}>Warning: Temperature is too low!</p>}
            {this.state.currentTemperature > this.state.maximumTemp && <p style={{ color: 'red' }}>Warning: Temperature is too high!</p>}
          </div>
          <div className="history">
            <h1>History</h1>
            <h3>Temperature</h3>
            {this.renderXYChart(
              this.state.historyData,
              "Temperature (°C)",
              "Temperature",
              "temperature",
              "Time",
              "time",
              ["auto", "auto"],
              ["dataMin - 3", "dataMax + 3"],
              (xAxisValue) => convertUnixTimeToHHMMSS(xAxisValue),
              undefined,
              (value, name, props) => {
                if (name === "Time") {
                  return convertUnixTimeToHHMMSS(value);
                }
                if (name === "Temperature") return value + " °C";
              }
            )}
            <h3>Relative humidity</h3>
            {this.renderXYChart(
              this.state.historyData,
              "Relative humidity (%)",
              "Humidity",
              "humidity",
              "Time",
              "time",
              ["auto", "auto"],
              ["dataMin - 10", "dataMax + 10"],
              (xAxisValue) => convertUnixTimeToHHMMSS(xAxisValue),
              undefined,
              (value, name, props) => {
                if (name === "Time") {
                  return convertUnixTimeToHHMMSS(value);
                }
                if (name === "Humidity") return value + " %";
              }
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
