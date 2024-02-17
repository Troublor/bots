use std::str::FromStr;

use alloy_primitives::{Address, U256};
use clap::{Parser, Subcommand, ValueEnum};

#[derive(Parser, Debug)]
#[clap(
    name = "cli",
    about = "Convert Ethereum address to checksum address or back"
)]
pub struct Cli {
    #[command(subcommand)]
    pub cmd: Commands,
}

#[derive(Debug, Clone, ValueEnum, PartialEq, Eq, Copy)]
pub enum AddressFormat {
    Checksum,
    Plain,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    #[command(arg_required_else_help = true)]
    Address {
        #[arg(short, long, default_value = "checksum")]
        convert: AddressFormat,

        #[arg(
            short,
            long,
            default_value = "false",
            help = "Tolerate invalid address, try to parse it as U256"
        )]
        tolerate: bool,

        address: String,
    },
}

fn main() {
    let args = Cli::parse();
    let Commands::Address {
        address,
        convert,
        tolerate,
    } = args.cmd;

    // parse input address
    let addr = if tolerate {
        let value = U256::from_str(&address)
            .map_err(|e| {
                eprintln!("Invalid address: {}", e);
                std::process::exit(1);
            })
            .unwrap();
        let bytes = &value.to_be_bytes_vec()[12..];
        let addr = Address::from_slice(bytes);
        addr
    } else {
        Address::from_str(&address)
            .map_err(|e| {
                eprintln!("Invalid address: {}", e);
                std::process::exit(1);
            })
            .unwrap()
    };

    // convert to required format
    let output = match convert {
        AddressFormat::Plain => {
            // checksum => normal
            addr.to_string().to_lowercase()
        }
        AddressFormat::Checksum => {
            // normal => checksum
            addr.to_string()
        }
    };

    println!("{}", output);
}
